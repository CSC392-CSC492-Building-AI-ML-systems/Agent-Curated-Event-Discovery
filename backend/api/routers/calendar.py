import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db.database import get_db
from ..models.calendar import CalendarEvent
from ..models.event import Event, Venue
from ..schemas.calendar import CalendarEventResponse, CalendarEventUpdate
from ..utils.auth import get_current_user
from ..utils.constructors import build_event

router = APIRouter(prefix="/users/me/calendar", tags=["Calendar"])
logger = logging.getLogger(__name__)


@router.get("")
async def get_calendar(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            select(Event, func.ST_AsGeoJSON(Venue.coordinates))
            .select_from(CalendarEvent)
            .join(CalendarEvent.event_obj)
            .join(Event.venue_obj)
            .options(
                selectinload(Event.tags),
                selectinload(Event.organizer_obj),
                selectinload(Event.venue_obj),
            )
            .where(CalendarEvent.user_id == UUID(user["sub"]))
            .order_by(Event.startdate, Event.starttime, Event.id)
            .offset(skip)
            .limit(limit)
        )
        return [build_event(event, coordinates) for event, coordinates in result.all()]
    except SQLAlchemyError:
        logger.exception("Unable to load calendar events")
        raise HTTPException(500, detail="Unable to load calendar events; please retry") from None


@router.put("", response_model=CalendarEventResponse)
async def add_calendar_event(
    payload: CalendarEventUpdate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        event_id = await db.scalar(select(Event.id).where(Event.id == payload.id))
        if event_id is None:
            raise HTTPException(404, detail="Event not found")
        await db.execute(
            insert(CalendarEvent)
            .values(user_id=UUID(user["sub"]), event_id=payload.id)
            .on_conflict_do_nothing(index_elements=["user_id", "event_id"])
        )
        await db.commit()
    except SQLAlchemyError:
        await db.rollback()
        logger.exception("Unable to add calendar event")
        raise HTTPException(500, detail="Unable to add event to calendar; please retry") from None
    return CalendarEventResponse(id=payload.id, message="Added to calendar")


@router.delete("", response_model=CalendarEventResponse)
async def remove_calendar_event(
    payload: CalendarEventUpdate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await db.execute(delete(CalendarEvent).where(
            CalendarEvent.user_id == UUID(user["sub"]),
            CalendarEvent.event_id == payload.id,
        ))
        await db.commit()
    except SQLAlchemyError:
        await db.rollback()
        logger.exception("Unable to remove calendar event")
        raise HTTPException(500, detail="Unable to remove event from calendar; please retry") from None
    return CalendarEventResponse(id=payload.id, message="Removed from calendar")
