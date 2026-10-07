from sqlalchemy import Boolean, DateTime, Numeric, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from datetime import datetime
from decimal import Decimal


class Base(DeclarativeBase):
    pass


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
