from pydantic import BaseModel, Field


class RatingUpdate(BaseModel):
    rating: int = Field(ge=1, le=5)


class RatingResponse(BaseModel):
    event_id: int
    rating: int
