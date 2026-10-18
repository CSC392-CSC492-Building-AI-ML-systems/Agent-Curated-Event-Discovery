from sqlalchemy import Boolean, Column, Date, ForeignKey, Integer, Numeric, \
    String, \
    Table, Text, Time
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from datetime import datetime, date
from decimal import Decimal
from geoalchemy2 import Geography
from typing import Optional


class Base(DeclarativeBase):
    pass


class TogatherEvent(Base):
    __tablename__ = "togatherevent"
    id: Mapped[str] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text)
    startdate: Mapped[str] = mapped_column(Text)
    enddate: Mapped[str] = mapped_column(Text)
    locationname: Mapped[str] = mapped_column(Text)
    inserteddate: Mapped[date] = mapped_column(Date)


class Venue(Base):
    __tablename__ = "venue"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    coordinates: Mapped[Optional[object]] = mapped_column(Geography(geometry_type="POINT", srid=4326))

    events: Mapped[list["Event"]] = relationship(back_populates="venue_obj")


class Organizer(Base):
    __tablename__ = "organizer"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[Optional[str]] = mapped_column(Text)
    phone: Mapped[Optional[str]] = mapped_column(Text)
    website: Mapped[Optional[str]] = mapped_column(Text)
    instagram: Mapped[Optional[str]] = mapped_column(Text)
    facebook: Mapped[Optional[str]] = mapped_column(Text)
    twitter: Mapped[Optional[str]] = mapped_column(Text)
    linkedin: Mapped[Optional[str]] = mapped_column(Text)
    tiktok: Mapped[Optional[str]] = mapped_column(Text)

    events: Mapped[list["Event"]] = relationship(back_populates="organizer_obj")

# SQLAlchemy convention for pure association table (a join table that holds
# nothing but the two foreign keys.) Using Core table instead of ORM class
event_tags = Table(
    "eventtags",
    Base.metadata,
    Column("eventid", ForeignKey("event.id"), primary_key=True),
    Column("tagid", ForeignKey("tag.id"), primary_key=True),
)


class Event(Base):
    __tablename__ = "event"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    startdate: Mapped[date] = mapped_column(Date, nullable=False)
    enddate: Mapped[date] = mapped_column(Date, nullable=False)
    starttime: Mapped[Optional[object]] = mapped_column(Time)
    endtime: Mapped[Optional[object]] = mapped_column(Time)
    venue: Mapped[int] = mapped_column(
        Integer, ForeignKey("venue.id", ondelete="RESTRICT"), nullable=False
    )
    organizer: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("organizer.id", ondelete="RESTRICT")
    )
    price: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2))
    link: Mapped[str] = mapped_column(Text, nullable=False)
    eighteenplus: Mapped[bool] = mapped_column(Boolean, nullable=False)

    venue_obj: Mapped["Venue"] = relationship(back_populates="events")
    organizer_obj: Mapped[Optional["Organizer"]] = relationship(
        back_populates="events"
    )
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
