from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from .event import Base


class UserProfile(Base):
    __tablename__ = "user_profile"

    # auth.users is managed by Supabase, outside this app's ORM metadata.
    user_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    first_name: Mapped[str | None] = mapped_column(String(100))
    last_name: Mapped[str | None] = mapped_column(String(100))
    username: Mapped[str | None] = mapped_column(String(30), unique=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
