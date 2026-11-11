import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    first_name: str | None
    last_name: str | None
    username: str | None

    @field_validator("first_name", "last_name", "username")
    @classmethod
    def trim(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is not None and len(value) > 100:
            raise ValueError("Names must contain at most 100 characters.")
        return value

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str | None) -> str | None:
        if value is None:
            return None
        # Restrict before lowercasing so Unicode case mappings cannot create ASCII usernames.
        if not re.fullmatch(r"[a-zA-Z0-9_]{3,30}", value):
            raise ValueError("Usernames must contain 3 to 30 characters.")
        return value.lower()


class ProfileResponse(ProfileUpdate):
    updated_at: datetime | None = None
