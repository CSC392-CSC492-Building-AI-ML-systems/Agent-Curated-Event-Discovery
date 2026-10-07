from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..db.database import get_db
from ..models.event import Event

router = APIRouter(prefix="/events")


@router.get("")
async def get_events(skip: int = Query(0, ge=0),
                     limit: int = Query(0, ge=1, le=100),
                     db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/{event_id}")
async def get_event(event_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).where(Event.id == event_id))

    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    return event
