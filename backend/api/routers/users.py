import logging
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, delete, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload 

from ..db.database import get_db
from ..models.event import Tag, Venue, Event
from ..models.preferences import UserPreferences, UserPreferenceTag
from ..models.user_actions import EventLiked, EventSaved
from ..schemas.preferences import PreferencesResponse, PreferencesUpdate
from ..schemas.user_actions import LikeOrSaveUpdate, LikeOrSaveResponse
from ..utils.auth import get_current_user
from ..utils.constructors import build_event

router = APIRouter(prefix="/users", tags=["Users"])
logger = logging.getLogger(__name__)


@router.get("/me")
def get_active_user(user: dict = Depends(get_current_user)):
    return {"id": user["sub"]}


# USER PREFERENCES

@router.get("/me/preferences", response_model=PreferencesResponse)
async def get_preferences(
    user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    # One query reads the profile and its tags from the same database snapshot.
    result = await db.execute(
        select(UserPreferences, UserPreferenceTag.tag_id)
        .outerjoin(UserPreferenceTag, UserPreferenceTag.user_id == UserPreferences.user_id)
        .where(UserPreferences.user_id == UUID(user["sub"]))
        .order_by(UserPreferenceTag.tag_id)
    )
    rows = result.all()
    if not rows:
        return PreferencesResponse()
    preferences = rows[0][0]
    return PreferencesResponse(
        age_group=preferences.age_group,
        budget=preferences.budget,
        interest_tag_ids=[tag_id for _, tag_id in rows if tag_id is not None],
        onboarding_completed=preferences.onboarding_completed,
    )


@router.put("/me/preferences", response_model=PreferencesResponse)
async def put_preferences(
    payload: PreferencesUpdate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = UUID(user["sub"])
    try:
        result = await db.execute(select(Tag.id).where(Tag.id.in_(payload.interest_tag_ids)))
        unknown = sorted(set(payload.interest_tag_ids) - set(result.scalars().all()))
        if unknown:
            raise HTTPException(status_code=422, detail=f"Unknown interest tag IDs: {unknown}")

        values = {
            "age_group": payload.age_group,
            "budget": payload.budget,
            "onboarding_completed": True,
        }
        # The upsert locks this user's row until commit, serializing concurrent PUTs.
        await db.execute(
            insert(UserPreferences).values(user_id=user_id, **values)
            .on_conflict_do_update(index_elements=[UserPreferences.user_id], set_=values)
        )
        await db.execute(delete(UserPreferenceTag).where(UserPreferenceTag.user_id == user_id))
        await db.execute(insert(UserPreferenceTag).values([
            {"user_id": user_id, "tag_id": tag_id} for tag_id in payload.interest_tag_ids
        ]))
        await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError:
        await db.rollback()
        # A tag can be removed between validation and insertion; the FK rejects it.
        raise HTTPException(status_code=422, detail="Preferences could not be saved; refresh tags and retry") from None
    except SQLAlchemyError:
        await db.rollback()
        logger.error("Saving user preferences failed")
        raise HTTPException(status_code=500, detail="Unable to save preferences; please retry") from None

    return PreferencesResponse(**payload.model_dump(), onboarding_completed=True)


# USER LIKES AND SAVES
@router.get("/me/likes")
async def get_likes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    print(f"user:{UUID(user["sub"])}")
    result = await db.execute(
        select(Event,
            func.ST_AsGeoJSON(Venue.coordinates).label("coordinates_geojson"))
        .select_from(EventLiked)
        .join(EventLiked.event_obj)
        .join(Event.venue_obj)
        .options(selectinload(Event.tags), selectinload(Event.organizer_obj), selectinload(Event.venue_obj))
        .where(EventLiked.user_id == UUID(user["sub"]))
        .order_by(EventLiked.timestamp.desc(), Event.id)
        .offset(skip)
        .limit(limit)
    )
    
    rows = result.all()
    return [
            build_event(event, coordinates_geojson)
            for event, coordinates_geojson in rows
        ]

@router.put("/me/like", response_model=LikeOrSaveResponse)
async def put_like(
    payload: LikeOrSaveUpdate,
    user: dict = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db),
):
    try:
        db.add(EventLiked(user_id=UUID(user["sub"]), event_id=payload.id))
        await db.flush() #raise integrity error if alr liked
        await db.execute(
            update(Event)
            .where(Event.id == payload.id)
            .values(likes=Event.likes + 1)
        )
        await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=422, detail="Error liking event, please reload")
    except SQLAlchemyError:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Unable to like event; please retry") from None

    return LikeOrSaveResponse(message="Successfully liked", id=payload.id)

@router.delete("/me/like", response_model=LikeOrSaveResponse)
async def delete_like(
    payload: LikeOrSaveUpdate,
    user: dict = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db),
):
    try:
            res = await db.execute(
                delete(EventLiked).where(
                    EventLiked.user_id == UUID(user["sub"]),
                    EventLiked.event_id == payload.id,
                )
            )
            if res.rowcount:                           
                await db.execute(
                    update(Event)
                    .where(Event.id == payload.id)
                    .values(likes=Event.likes - 1)
                )
            await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=422, detail="Error unliking event, please reload")
    except SQLAlchemyError:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Unable to unlike event; please retry") from None

    return LikeOrSaveResponse(message="Successfully unliked", id=payload.id)

@router.get("/me/saves")
async def get_saves(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: dict = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Event,
            func.ST_AsGeoJSON(Venue.coordinates).label("coordinates_geojson"))
        .select_from(EventSaved)
        .join(EventSaved.event_obj)
        .join(Event.venue_obj)
        .options(selectinload(Event.tags), selectinload(Event.organizer_obj), selectinload(Event.venue_obj))
        .where(EventSaved.user_id == UUID(user["sub"]))
        .order_by(EventSaved.timestamp.desc(), Event.id)
        .offset(skip)
        .limit(limit)
    )
    
    rows = result.all()
    return [
            build_event(event, coordinates_geojson)
            for event, coordinates_geojson in rows
        ]

@router.put("/me/save", response_model=LikeOrSaveResponse)
async def put_save(
    payload: LikeOrSaveUpdate,
    user: dict = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db),
):
    try:
        db.add(EventSaved(user_id=UUID(user["sub"]), event_id=payload.id))
        await db.flush() #raise integrity error if alr saved
        await db.execute(
            update(Event)
            .where(Event.id == payload.id)
            .values(saves=Event.saves + 1)
        )
        await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=422, detail="Error saving event, please reload")
    except SQLAlchemyError as e:
        print(e)
        await db.rollback()
        raise HTTPException(status_code=500, detail="Unable to save event; please retry") from None

    return LikeOrSaveResponse(message="Successfully saved", id=payload.id)

@router.delete("/me/save", response_model=LikeOrSaveResponse)
async def delete_save(
    payload: LikeOrSaveUpdate,
    user: dict = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db),
):
    try:
        res = await db.execute(
            delete(EventSaved).where(
                EventSaved.user_id == UUID(user["sub"]),
                EventSaved.event_id == payload.id,
            )
        )
        if res.rowcount:                           
            await db.execute(
                update(Event)
                .where(Event.id == payload.id)
                .values(saves=Event.saves - 1)
            )
        await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=422, detail="Error unsaving event, please reload")
    except SQLAlchemyError:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Unable to unsave event; please retry") from None

    return LikeOrSaveResponse(message="Successfully unsaved", id=payload.id)