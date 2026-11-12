from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from .event import Base


class Friendship(Base):
    __tablename__ = "friendships"
    __table_args__ = (
        CheckConstraint(
            "user_low_id < user_high_id",
            name="different_users",
        ),
        CheckConstraint(
            "requested_by IN (user_low_id, user_high_id)",
            name="valid_requester",
        ),
        CheckConstraint(
            "status IN ('pending', 'accepted')",
            name="friendships_status_check",
        ),
        CheckConstraint(
            "(status = 'pending' AND accepted_at IS NULL) OR "
            "(status = 'accepted' AND accepted_at IS NOT NULL)",
            name="valid_acceptance",
        ),
        Index("idx_friendships_low_status", "user_low_id", "status"),
        Index("idx_friendships_high_status", "user_high_id", "status"),
    )

    user_low_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("user_profile.user_id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_high_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("user_profile.user_id", ondelete="CASCADE"),
        primary_key=True,
    )
    requested_by: Mapped[UUID] = mapped_column(Uuid, nullable=False)
    status: Mapped[str] = mapped_column(
        Text, nullable=False, server_default="pending"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    accepted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
