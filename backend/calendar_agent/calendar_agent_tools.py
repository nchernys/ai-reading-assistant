import os
from langchain.tools import tool
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from dateutil.parser import parse
from dateutil import parser
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from zoneinfo import ZoneInfo
import requests
from llm_config import llm
import json

SCOPES = ['https://www.googleapis.com/auth/calendar']

def get_calendar_service():
    creds = None

    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    else:
        flow = InstalledAppFlow.from_client_secrets_file(
            'credentials.json', SCOPES
        )
        creds = flow.run_local_server(port=0)
        with open('token.json', 'w') as token:
            token.write(creds.to_json())

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())

    return build('calendar', 'v3', credentials=creds)

def get_current_local_time(timezone: str) -> str:
    tz = ZoneInfo(timezone)
    now = datetime.now(tz)
    time = now.strftime("%H:%M:%S")
    return f"The current local time is {time}"

def get_current_day(timezone: str) -> str:
    tz = ZoneInfo(timezone)
    now = datetime.now(tz)
    formatted = now.strftime("%A, %B %d, %Y at %I:%M %p")
    day_of_week = now.strftime('%A')
    current_time = now.strftime("%H:%M:%S")

    return f"Today is {day_of_week}, {formatted}, current local time: {current_time}"

def get_current_year(timezone: str) -> str:
    tz = ZoneInfo(timezone)
    year = datetime.now(tz).year
 
    return f"The current year is {year}"


def force_local_time(iso_str: str, tz: ZoneInfo) -> datetime:
    dt = parser.isoparse(iso_str)
    dt_naive = dt.replace(tzinfo=None)
    return dt_naive.replace(tzinfo=tz)


def clamp_end_time_if_needed(start: datetime, end: datetime, grain: str) -> datetime:
    if grain == "hour":
        return start + timedelta(hours=1)
    elif grain == "minute":
        return start + timedelta(minutes=1)
    elif grain == "day":
        return start + timedelta(days=1)
    else:
        return end  # fallback: use whatever Duckling returned
    

def extract_event_title(input_text: str) -> str:
    prompt = f'Extract just the Google Calendar event title from this sentence:\n\n"{input_text}"\n\nTitle:'
    try:
        response = llm.invoke(prompt)
        content = getattr(response, "content", "").strip().strip('"')
        return content if content else "Meeting"
    except Exception as e:
        return "Meeting"

def get_calendar_events(input: str):
    try:
        params = json.loads(input)
    except json.JSONDecodeError:
        return "Error: could not parse JSON input."

    start_time = params.get("start_time")
    end_time = params.get("end_time")
    timezone = params.get("timezone", "America/New_York")
    
    try:
        service = get_calendar_service()
        events_result = service.events().list(
            calendarId='primary',
            timeMin=start_time,
            timeMax=end_time,
            singleEvents=True,
            orderBy='startTime'
        ).execute()

        events = events_result.get('items', [])

        if not events:
            return "No events found in that time range."

        formatted_events = []
        for event in events:
            # Parse start and end time
            start_str = event['start'].get('dateTime', event['start'].get('date'))
            end_str = event['end'].get('dateTime', event['end'].get('date'))

            try:
                start = parser.isoparse(start_str).astimezone(ZoneInfo(timezone))
                end = parser.isoparse(end_str).astimezone(ZoneInfo(timezone))
                formatted_start = start.strftime("%A, %B %d, %Y at %I:%M %p")
                formatted_end = end.strftime("%A, %B %d, %Y at %I:%M %p")
            except Exception:
                start = start_str
                end = end_str

            formatted_events.append({
                "title": event.get("summary", "No title"),
                "start": formatted_start,
                "end": formatted_end,
                "attendees": [att.get("email") for att in event.get("attendees", []) if "email" in att],
                "conference_link": event.get("conferenceData", {}).get("entryPoints", [{}])[0].get("uri"),
                "location": event.get("location"),
                "description": event.get("description")
            })

        return {"events": formatted_events}

    except Exception as e:
        return {"error": f"Error fetching events: {e}"}


def is_slot_available(input: str) -> str:
    # Try to extract timezone from input
    timezone = "America/New_York"  # default
    for tz_candidate in input.split():
        if "/" in tz_candidate and any(tz_candidate.startswith(prefix) for prefix in ["America", "Europe", "Asia", "Africa", "Australia"]):
            timezone = tz_candidate
            timezone = tz_candidate.rstrip(".,?!;)")
            break

    tz = ZoneInfo(timezone)
    now = datetime.now(tz)

    try:
        parsed_dt = parse(input, fuzzy=True, default=now)
        start_dt = parsed_dt.astimezone(tz)
        end_dt = start_dt + timedelta(minutes=30)
    except Exception as e:
        return f"Sorry, I couldn’t understand the time. Error: {e}"

    try:
        service = get_calendar_service()
        events = service.events().list(
            calendarId="primary",
            timeMin=start_dt.isoformat(),
            timeMax=end_dt.isoformat(),
            singleEvents=True,
            orderBy="startTime"
        ).execute().get("items", [])

        if not events:
            return f"You are available at {start_dt.strftime('%I:%M %p')} ({timezone})."
        else:
            return f"You are NOT available at {start_dt.strftime('%I:%M %p')} ({timezone}). {len(events)} event(s) found. Scheduling conflict with the event: {events[0].get('summary')}. The event starts at {events[0].get('start')} and ends at {events[0].get('end')}"
    except Exception as e:
        return f"Calendar error: {e}"


def schedule_meeting(input: str):
    try:
        params = json.loads(input)
    except json.JSONDecodeError:
        return "Error: could not parse JSON input."

    attendees_list = []
    location = ""
    conference_link = ""
    description = ""

    start_time = params.get("start_time")
    end_time = params.get("end_time")
    timezone = params.get("timezone", "America/New_York")
    event_title = params.get("event_title")
    attendees_list = params.get("attendees_list", [])  # Should be a list of emails
    location = params.get("location", "")
    conference_link = params.get("conference_link", "")
    description = params.get("description", "")

    if not end_time:
        start_dt = datetime.fromisoformat(start_time)
        end_dt = start_dt + timedelta(hours=1)
        end_time = end_dt.isoformat()
        
    if not start_time or not end_time or not event_title:
        return "Error: start_time, end_time, and event_title are required."

    if isinstance(attendees_list, str) & len(attendees_list) > 1:
        attendees_list = [email.strip() for email in attendees_list.split(",") if email.strip()]

    attendees = []
    for email in attendees_list: 
        attendees.append({"email": email})

    service = get_calendar_service()
    
    full_description = f"{description}{' | Link: ' + conference_link if conference_link else ''}" 
    event = {
        "summary": event_title,
        "start": {"dateTime": start_time, "timeZone": timezone},
        "end": {"dateTime": end_time, "timeZone": timezone},
        "attendees": attendees,
        "location": location,
        "description": full_description
    }

    try:
        created = service.events().insert(calendarId="primary", body=event, sendUpdates="all").execute()
        return f"Meeting '{event}' scheduled: {created.get('htmlLink')}"
    except Exception as e:

        return f"Calendar error: {event}"


def delete_meeting(input: str):
    
    try:
        params = json.loads(input)
    except json.JSONDecodeError:
        return "Error: could not parse JSON input."

    start_time = params.get("start_time")
    timezone = params.get("timezone", "America/New_York")
    event_title = params.get("event_title")

    start_dt = datetime.fromisoformat(start_time)
    end_dt = start_dt + timedelta(minutes=90)
    end_time = end_dt.isoformat()


    if not start_time or not event_title:
        return "Error: start_time and event_title are required."

    service = get_calendar_service()
    events_result = service.events().list(
        calendarId='primary',
        timeMin=start_time,
        timeMax=end_time,
        singleEvents=True,
        orderBy='startTime'
    ).execute()

    events = events_result.get('items', [])

    for event in events:
        if event.get('summary', '').lower() == event_title.lower():
            event_id = event['id']
            try:
                service.events().delete(calendarId='primary', eventId=event_id).execute()
                return f"Meeting '{event_title}' at {start_time} was deleted."
            except Exception as e:
                return f"Error deleting event: {e}"

    return f"No matching event found for '{event_title}' at {start_time}."