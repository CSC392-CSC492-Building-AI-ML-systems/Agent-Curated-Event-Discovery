import json

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db.database import get_db
from ..models.event import Event, Venue
from ..models.recommendations import UserRecommendedEvent
from ..utils.constructors import build_event
from ..utils.auth import get_optional_current_user
from uuid import UUID

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
async def get_event(event_id: int, db: AsyncSession = Depends(get_db), user: dict | None = Depends(get_optional_current_user)):
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
    event_obj = build_event(event, coordinates_geojson)

    if user is not None:
        recommendation = await db.execute(
            select(UserRecommendedEvent.description)
            .where(
                and_(
                    UserRecommendedEvent.event_id == event_id,
                    UserRecommendedEvent.user_id == UUID(user["sub"]),
                    UserRecommendedEvent.rejected.is_(False),
                )
            )
        )
        row = recommendation.one_or_none()
        if row is not None:
            event_obj["recommendation"] = row.description
    return event_obj
