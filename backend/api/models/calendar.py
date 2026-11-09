from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .event import Base, Event


class CalendarEvent(Base):
    __tablename__ = "event_calendar"

    # The migration references auth.users, outside this application's metadata.
    user_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    event_id: Mapped[int] = mapped_column(
        ForeignKey("event.id", ondelete="CASCADE"), primary_key=True
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    event_obj: Mapped[Event] = relationship()
