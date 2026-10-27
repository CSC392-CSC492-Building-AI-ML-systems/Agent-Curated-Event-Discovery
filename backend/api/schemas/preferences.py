from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

AgeGroup = Literal["20_29", "30_39", "40_49", "50_59", "60_69", "70_79", "80_plus"]
Budget = Literal["free", "under_25", "25_to_50", "50_to_100", "100_to_200", "over_200"]
TagId = Annotated[int, Field(strict=True, gt=0)]


class PreferencesUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # PUT replaces the full set: nullable fields must be supplied explicitly.
    age_group: AgeGroup | None
    budget: Budget | None
    interest_tag_ids: list[TagId] = Field(min_length=1)

    @field_validator("interest_tag_ids")
    @classmethod
    def unique_tag_ids(cls, values: list[int]) -> list[int]:
        if len(values) != len(set(values)):
            raise ValueError("Interest tag IDs must be unique")
        return sorted(values)


class PreferencesResponse(BaseModel):
    age_group: AgeGroup | None = None
    budget: Budget | None = None
    interest_tag_ids: list[int] = Field(default_factory=list)
    onboarding_completed: bool = False
