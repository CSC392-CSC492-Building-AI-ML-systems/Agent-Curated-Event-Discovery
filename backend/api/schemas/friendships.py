from datetime import datetime
from uuid import UUID
from typing import Literal

from pydantic import BaseModel, Field


class FriendRequestCreate(BaseModel):
    username: str = Field(min_length=1, max_length=30)


class FriendRequestResponse(BaseModel):
    user_id: UUID
    username: str
    status: Literal["pending"]


class FriendRequestItem(BaseModel):
    user_id: UUID
    username: str
    created_at: datetime


class FriendRequestsResponse(BaseModel):
    incoming: list[FriendRequestItem]
    outgoing: list[FriendRequestItem]


class FriendResponse(BaseModel):
    user_id: UUID
    username: str
    accepted_at: datetime

