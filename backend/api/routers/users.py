import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_db
from ..models.event import Tag
from ..models.preferences import UserPreferences, UserPreferenceTag
from ..schemas.preferences import PreferencesResponse, PreferencesUpdate
from ..utils.auth import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])
logger = logging.getLogger(__name__)


@router.get("/me")
def get_active_user(user: dict = Depends(get_current_user)):
    return {"id": user["sub"]}


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
