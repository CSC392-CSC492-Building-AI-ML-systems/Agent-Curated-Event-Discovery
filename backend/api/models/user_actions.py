from uuid import UUID
from sqlalchemy import DateTime, ForeignKey, Uuid, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from .event import Base, Event

class EventLiked(Base):
    __tablename__ = "event_liked"

    # The Supabase migration also references auth.users, outside this app's metadata.
    user_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("event.id"), primary_key=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    event_obj: Mapped["Event"] = relationship()

class EventSaved(Base):
    __tablename__ = "event_saved"

    # The Supabase migration also references auth.users, outside this app's metadata.
    user_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("event.id"), primary_key=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    event_obj: Mapped["Event"] = relationship()
