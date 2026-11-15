"""Weekly availability contract shared by the API and recommendation consumers."""
from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

MINUTES_PER_SLOT = 30
MINUTES_PER_DAY = 1440
MAX_WINDOWS = 7 * (MINUTES_PER_DAY // MINUTES_PER_SLOT)
DayOfWeek = Annotated[int, Field(strict=True, ge=0, le=6)]
StartMinute = Annotated[int, Field(strict=True, ge=0, le=1410, multiple_of=MINUTES_PER_SLOT)]
EndMinute = Annotated[int, Field(strict=True, ge=30, le=MINUTES_PER_DAY, multiple_of=MINUTES_PER_SLOT)]


class AvailabilityWindow(BaseModel):
    model_config = ConfigDict(extra="forbid")

    day_of_week: DayOfWeek = Field(description="Sunday = 0 through Saturday = 6")
    start_minute: StartMinute = Field(description="Toronto local minutes after midnight")
    end_minute: EndMinute = Field(description="Exclusive; 1440 means the end of this day")

    @model_validator(mode="after")
    def validate_range(self) -> Self:
        if self.end_minute <= self.start_minute:
            raise ValueError("end_minute must be greater than start_minute; split overnight ranges at midnight")
        return self


class WeeklyAvailability(BaseModel):
    model_config = ConfigDict(extra="forbid")

    windows: list[AvailabilityWindow] = Field(max_length=MAX_WINDOWS)

    @model_validator(mode="after")
    def normalize_windows(self) -> Self:
        merged: list[AvailabilityWindow] = []
        for window in sorted(self.windows, key=lambda w: (w.day_of_week, w.start_minute, w.end_minute)):
            previous = merged[-1] if merged else None
            if previous and previous.day_of_week == window.day_of_week and window.start_minute <= previous.end_minute:
                previous.end_minute = max(previous.end_minute, window.end_minute)
            else:
                merged.append(window.model_copy())
        self.windows = merged
        return self
