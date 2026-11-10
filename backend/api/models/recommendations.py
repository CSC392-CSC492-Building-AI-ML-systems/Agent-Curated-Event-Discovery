from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from .event import Base


class UserRecommendedEvent(Base):
    __tablename__ = "user_recommended_events"

    user_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("event.id", ondelete="CASCADE"), primary_key=True)
    rejected: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    liked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    description: Mapped[str | None] = mapped_column(Text)
