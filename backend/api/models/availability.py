from uuid import UUID

from sqlalchemy import CheckConstraint, SmallInteger, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from .event import Base


class UserAvailability(Base):
    __tablename__ = "user_availability"
    __table_args__ = (
        CheckConstraint("day_of_week BETWEEN 0 AND 6"),
        CheckConstraint("start_minute BETWEEN 0 AND 1410 AND start_minute % 30 = 0"),
        CheckConstraint("end_minute BETWEEN 30 AND 1440 AND end_minute % 30 = 0"),
        CheckConstraint("end_minute > start_minute"),
    )

    # The SQL migration references auth.users, outside this app's ORM metadata.
    user_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    day_of_week: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    start_minute: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    end_minute: Mapped[int] = mapped_column(SmallInteger, nullable=False)
