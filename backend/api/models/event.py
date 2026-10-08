from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Numeric, String, \
    Table, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from datetime import datetime
from decimal import Decimal


class Base(DeclarativeBase):
    pass


event_tags = Table(
    "eventtags",
    Base.metadata,
    Column("eventid", ForeignKey("event.id"), primary_key=True),
    Column("tagid", ForeignKey("tag.id"), primary_key=True),
)


class Event(Base):
    __tablename__ = "event"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)
    startdatetime: Mapped[datetime] = mapped_column(DateTime)
    enddatetime: Mapped[datetime] = mapped_column(DateTime)
    venue: Mapped[int] = mapped_column()
    organizer: Mapped[int | None] = mapped_column()
    price: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    link: Mapped[str] = mapped_column(Text)
    eighteenplus: Mapped[bool] = mapped_column(Boolean)

    tags: Mapped[list["Tag"]] = relationship(
        secondary=event_tags,
        back_populates="events",
    )


class Tag(Base):
    __tablename__ = "tag"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String)

    events: Mapped[list[Event]] = relationship(
        secondary=event_tags,
        back_populates="tags",
    )
