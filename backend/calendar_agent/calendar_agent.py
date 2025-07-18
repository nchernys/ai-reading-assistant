from langchain.agents import initialize_agent, Tool
from langchain.agents.agent_types import AgentType
from calendar_agent.calendar_agent_tools import get_calendar_events, get_current_day, get_current_year, delete_meeting, get_current_local_time, is_slot_available, schedule_meeting
import fitz
from llm_config import llm, memory
from dotenv import load_dotenv
load_dotenv()

tools = [
    Tool(
        name="get_current_day",
        func=get_current_day,
        description="Returns the current date (day, month, year) in the specified timezone."
    ),
     Tool(
        name="get_current_year",
        func=get_current_year,
        description="Returns the current year in the specified timezone."
    ),
    Tool(
        name="get_current_local_time",
        func=get_current_local_time,
        description="Returns the current time in the specified timezone. Input must be a string timezone like 'America/New_York'."
    ),
    Tool(
        name="is_slot_available",
        func=is_slot_available,
        description = "Checks if a given time is free in your Google Calendar based on a natural language string like 'Am I available at 7:30 pm?'. If the given time not free, returns the scheduled event (like 'You already have a movie with friends at this time'). Expects one argument: a natural language string with time and timezone."
        ),
    Tool(
        name="schedule_meeting",
        func=schedule_meeting,
        description="""
        Schedules a calendar event.
            - start_time: ISO 8601 formatted start time. Example: "2025-07-03T09:00:00-04:00".
            - end_time: ISO 8601 formatted end time. Example: "2025-07-04T09:00:00-04:00".
            - timezone: The timezone string, e.g., "America/New_York".
            - event_title: The event title, e.g., "Meeting with Jenny", "Movie", "Study Session".
            - description: The event description, e.g., "Brainstorming ideas", "Developing auth components", "Studying for the exam".
            - attendees_list: Attendees' email addresses, e.g., ["john@outlook.com", "jane@gmail.com"]. 
            - location: The place where the meeting will take place, e.g., "cafe Driad", "campus", "Franklin street near Target".
            - conference_link:The meeting link for Zoom, Teams, Google Meet, e.g., "https://zoom.us/j/1234567890", "https://teams.microsoft.com/l/meetup-join/19%3ameeting_N2ZlMDA5YzgtZDg0ZC00ZTQ4LTg3YTUtZjUxYmRjYjU5YjVk%40thread.v2/0?context=%7b%22Tid%22%3a%22xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx%22%2c%22Oid%22%3a%22xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx%22%7d", "https://meet.google.com/abc-defg-hij".   
        """
    ),
    Tool(
        name="delete_meeting",
        func=delete_meeting,
        description="""
        Delete a calendar event based on the start time and title.
        Parameters:
            - start_time: ISO 8601 formatted start time. Example: "2025-07-03T09:00:00-04:00".
            - timezone: The timezone of the request, e.g., "America/New_York".
            - event_title: The event title, e.g., "Meeting with Jenny", "Movie", "Study Session".
      
     """
    ),

    Tool(
        name="get_calendar_events",
        func=get_calendar_events,
         description="""
            Retrieves calendar events scheduled between a start and end time.
            Parameters:
            - start_time: ISO 8601 datetime string. Example: "2025-07-03T09:00:00-04:00"
            - end_time: ISO 8601 datetime string. Example: "2025-07-04T09:00:00-04:00"
            - timezone: The timezone string. Example: "America/New_York"
        """
    )
]

system_message = """
        You are a helpful and conversational assistant.
        Always respond in complete sentences, politely and clearly answering the user's question.
        If a meeting participant is named, say: "Your first meeting is with Jen." instead of just "Jen." or "You have 2 meetings with Jen this month." instead of just "2".
    """

agent = initialize_agent(
    tools=tools,
    llm=llm,
    agent_type=AgentType.OPENAI_FUNCTIONS,
    memory=memory,
    verbose=True,
    system_message=system_message
)
