import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from ..db.database import get_db
from ..models.event import Event, Tag, Venue
from ..utils.constructors import build_event

router = APIRouter(prefix="/tags")


@router.get("")
async def get_tags(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tag))
    return result.scalars().all()


@router.get("/{tag_id}")
async def get_tag(tag_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tag).where(Tag.id == tag_id))

    tag = result.scalar_one_or_none()
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")

    return tag


@router.get("/{tag_id}/events")
async def get_events_for_tag(tag_id: int, db: AsyncSession = Depends(get_db)):
    tag_result = await db.execute(
        select(Tag.id).where(Tag.id == tag_id)
    )

    if tag_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Tag not found")

    result = await db.execute(
        select(
            Event,
            func.ST_AsGeoJSON(Venue.coordinates).label("coordinates_geojson"),
        )
        .join(Event.venue_obj)
        .join(Event.tags)
        .where(Tag.id == tag_id)
        .options(
            selectinload(Event.tags),
            selectinload(Event.organizer_obj),
            selectinload(Event.venue_obj),
        )
        .order_by(Event.id)
    )

    rows = result.all()

    return [
        build_event(event, coordinates_geojson)
        for event, coordinates_geojson in rows
    ]
