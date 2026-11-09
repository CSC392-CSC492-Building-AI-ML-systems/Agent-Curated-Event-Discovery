from pydantic import BaseModel, ConfigDict, Field


class CalendarEventUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int = Field(strict=True, gt=0)


class CalendarEventResponse(BaseModel):
    id: int
    message: str
