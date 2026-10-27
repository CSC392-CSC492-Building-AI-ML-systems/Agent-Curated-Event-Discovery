from uuid import UUID

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from .event import Base


class UserPreferences(Base):
    __tablename__ = "user_preferences"
    __table_args__ = (
        CheckConstraint(
            "age_group IS NULL OR age_group IN "
            "('20_29', '30_39', '40_49', '50_59', '60_69', '70_79', '80_plus')",
            name="user_preferences_age_group_check",
        ),
        CheckConstraint(
            "budget IS NULL OR budget IN "
            "('free', 'under_25', '25_to_50', '50_to_100', '100_to_200', 'over_200')",
            name="user_preferences_budget_check",
        ),
    )

    # The Supabase migration also references auth.users, outside this app's metadata.
    user_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    age_group: Mapped[str | None] = mapped_column(String)
    budget: Mapped[str | None] = mapped_column(String)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, nullable=False)


class UserPreferenceTag(Base):
    __tablename__ = "user_preference_tags"

    user_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("user_preferences.user_id", ondelete="CASCADE"), primary_key=True
    )
    tag_id: Mapped[int] = mapped_column(
        ForeignKey("tag.id", ondelete="RESTRICT"), primary_key=True
    )
