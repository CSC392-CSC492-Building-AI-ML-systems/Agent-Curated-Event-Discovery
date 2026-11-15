from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from .event import Base


class CalendarSubscription(Base):
    __tablename__ = "calendar_subscription"

    # The migration references auth.users, outside this application's metadata.
    user_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
