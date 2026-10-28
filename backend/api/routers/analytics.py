# TODO: remove unused imports
from datetime import datetime
import json

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert


from ..db.database import get_db
from ..models.analytics import EventClicked, TagClicked, SearchPerformed
from ..models.event import Event, Tag
from ..utils.auth import get_current_user


router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.post("/events/{event_id}/click", status_code=204)
async def track_event_click(
    event_id: int,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # check whether the event_id is valid
    event_exists = await db.execute(select(Event.id).where(Event.id == event_id))
    if event_exists.one_or_none() is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # try to insert the click into the db
    stmt = pg_insert(EventClicked).values(
        user_id=user["sub"],
        event_id=event_id,
        num_clicks=1,
        last_clicked=datetime.now(),
    )
    # if a click for this user and event already exist, increment the counter and update the last_clicked timestamp
    stmt = stmt.on_conflict_do_update(
        index_elements=["user_id", "event_id"],
        set_={
            "num_clicks": EventClicked.num_clicks + 1,
            "last_clicked": stmt.excluded.last_clicked,
        },
    )
    await db.execute(stmt)

    # insert the click into the Event table
    stmt = update(Event).where(Event.id == event_id).values(clicks=Event.clicks + 1)
    await db.execute(stmt)

    # commit the changes to the db
    await db.commit()


@router.post("/tags/{tag_id}/click", status_code=204)
async def track_tag_click(
        tag_id: int,
        user: dict = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
):
    # check whether the tag_id is valid
    tag_exists = await db.execute(select(Tag.id).where(Tag.id == tag_id))
    if tag_exists.one_or_none() is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    # try to insert the click into the db
    stmt = pg_insert(TagClicked).values(
        user_id=user["sub"],
        tag_id=tag_id,
        num_clicks=1,
        last_clicked=datetime.now(),
    )
    # if a click for this user and tag already exist, increment the counter and update the last_clicked timestamp
    stmt = stmt.on_conflict_do_update(
        index_elements=["user_id", "tag_id"],
        set_={
            "num_clicks": TagClicked.num_clicks + 1,
            "last_clicked": stmt.excluded.last_clicked,
        },
    )

    await db.execute(stmt)
    await db.commit()


@router.post("/searches", status_code=204)
async def track_search(
    payload,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = payload.get("query")
    if query is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    # clean the search query
    query = " ".join(query.strip().lower().split())

    if not query:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    # try to insert the search into the db
    stmt = pg_insert(SearchPerformed).values(
        user_id=user["sub"],
        query=query,
        num_searches=1,
        last_searched=datetime.now(),
    )
    # if a search for this user and query already exist, increment the counter and update the last_searched timestamp
    stmt = stmt.on_conflict_do_update(
        index_elements=["user_id", "query"],
        set_={
            "num_searches": SearchPerformed.num_searches + 1,
            "last_searched": stmt.excluded.last_searched,
        },
    )