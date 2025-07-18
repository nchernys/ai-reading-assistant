from pydantic import BaseModel
from typing import Optional

class Query(BaseModel):
    question: str
    timezone: Optional[str] = "America/New_York"

class CalendarEventQuery(BaseModel):
    start_time: str
    end_time: str
    timezone: Optional[str] = "America/New_York"

class AskRequest(BaseModel):
    question: str