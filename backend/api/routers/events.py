import json

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db.database import get_db
from ..models.event import Event, Venue
from ..utils.constructors import build_event

router = APIRouter(prefix="/events")


@router.get("")
async def get_events(skip: int = Query(0, ge=0),
                     limit: int = Query(50, ge=1, le=100),
                     db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            Event,
            func.ST_AsGeoJSON(Venue.coordinates).label("coordinates_geojson"),
        )
        .join(Event.venue_obj)
        .options(
            selectinload(Event.tags),
            selectinload(Event.organizer_obj),
            selectinload(Event.venue_obj),
        )
        .order_by(Event.id)
        .offset(skip)
        .limit(limit)
    )

    rows = result.all()

    return [
        build_event(event, coordinates_geojson)
        for event, coordinates_geojson in rows
    ]


@router.get("/{event_id}")
async def get_event(event_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            Event,
            func.ST_AsGeoJSON(Venue.coordinates).label("coordinates_geojson"),
        )
        .join(Event.venue_obj)
        .options(
            selectinload(Event.tags),
            selectinload(Event.organizer_obj),
            selectinload(Event.venue_obj),
        )
        .where(Event.id == event_id)
    )

    row = result.one_or_none()

    if row is None:
        raise HTTPException(status_code=404, detail="Event not found")

    event, coordinates_geojson = row

    return build_event(event, coordinates_geojson)
