import json
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db.database import get_db
from ..models.event import Event, EventRating, Venue
from ..schemas.ratings import RatingResponse, RatingUpdate
from ..utils.auth import get_current_user
from ..utils.constructors import build_event

router = APIRouter(prefix="/events")

avg_rating_sq = (
    select(func.avg(EventRating.rating))
    .where(EventRating.event_id == Event.id)
    .correlate(Event)
    .scalar_subquery()
)

rating_count_sq = (
    select(func.count(EventRating.rating))
    .where(EventRating.event_id == Event.id)
    .correlate(Event)
    .scalar_subquery()
)


@router.get("")
async def get_events(skip: int = Query(0, ge=0),
                     limit: int = Query(50, ge=1, le=100),
                     db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            Event,
            func.ST_AsGeoJSON(Venue.coordinates).label("coordinates_geojson"),
            avg_rating_sq.label("avg_rating"),
            rating_count_sq.label("rating_count"),
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
        build_event(event, coordinates_geojson, avg_rating, rating_count)
        for event, coordinates_geojson, avg_rating, rating_count in rows
    ]


@router.get("/{event_id}")
async def get_event(event_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            Event,
            func.ST_AsGeoJSON(Venue.coordinates).label("coordinates_geojson"),
            avg_rating_sq.label("avg_rating"),
            rating_count_sq.label("rating_count"),
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

    event, coordinates_geojson, avg_rating, rating_count = row

    return build_event(event, coordinates_geojson, avg_rating, rating_count)


@router.put("/{event_id}/rating")
async def rate_event(event_id: int, body: RatingUpdate,
               db: AsyncSession = Depends(get_db),
               user: dict = Depends(get_current_user)):
    result = await db.execute(select(Event.id).where(Event.id == event_id))

    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Event not found")

    user_id = UUID(user["sub"])

    try:
        await db.execute(
            insert(EventRating)
            .values(user_id=user_id, event_id=event_id, rating=body.rating)
            .on_conflict_do_update(
                index_elements=[EventRating.user_id, EventRating.event_id],
                set_={"rating": body.rating, "timestamp": func.now()},
            )
        )
        await db.commit()
    except Exception:
        await db.rollback()
        raise

    return RatingResponse(event_id=event_id, rating=body.rating)

