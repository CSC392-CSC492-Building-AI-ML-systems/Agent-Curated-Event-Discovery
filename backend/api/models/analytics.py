# TODO: remove unused imports
from uuid import UUID

from sqlalchemy import ForeignKey, Uuid, Column, Integer, Table, Text, Time, DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from datetime import datetime

class Base(DeclarativeBase):
    pass

class EventClicked(Base):
    __tablename__ = "event_clicked"
    user_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("auth.users.id", ondelete="CASCADE"), primary_key=True
    )
    event_id: Mapped[int] = mapped_column(
        ForeignKey("event.id", ondelete="CASCADE"), primary_key=True
    )
    num_clicks: Mapped[int] = mapped_column(Integer, nullable=False)
    last_clicked: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    # TODO: may need to add the back populates thing


class TagClicked(Base):
    __tablename__ = "tag_clicked"
    user_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("auth.users.id", ondelete="CASCADE"), primary_key=True
    )
    tag_id: Mapped[int] = mapped_column(
        ForeignKey("tag.id", ondelete="CASCADE"), primary_key=True
    )
    num_clicks: Mapped[int] = mapped_column(Integer, nullable=False)
    last_clicked: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    # TODO: may need to add the back populates thing


class SearchPerformed(Base):
    __tablename__ = "search_performed"
    user_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("auth.users.id", ondelete="CASCADE"), primary_key=True
    )
    query: Mapped[str] = mapped_column(Text, primary_key=True)
    num_searches: Mapped[int] = mapped_column(Integer, nullable=False)
    last_searched: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    # TODO: may need to add the back populates thing

