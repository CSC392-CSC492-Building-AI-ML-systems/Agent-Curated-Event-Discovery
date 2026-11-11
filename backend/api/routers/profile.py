import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_db
from ..models.profile import UserProfile
from ..schemas.profile import ProfileResponse, ProfileUpdate
from ..utils.auth import get_current_user

router = APIRouter(prefix="/users/me/profile", tags=["Profile"])
logger = logging.getLogger(__name__)
PRIVATE_HEADERS = {"Cache-Control": "private, no-store"}


@router.get("", response_model=ProfileResponse)
async def get_profile(response: Response, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    response.headers.update(PRIVATE_HEADERS)
    try:
        row = (await db.execute(select(UserProfile).where(UserProfile.user_id == UUID(user["sub"])))).scalar_one_or_none()
        if row is None:
            return ProfileResponse(first_name=None, last_name=None, username=None)
        return ProfileResponse(first_name=row.first_name, last_name=row.last_name, username=row.username, updated_at=row.updated_at)
    except SQLAlchemyError:
        logger.error("Unable to load profile")
        raise HTTPException(500, "Unable to load profile; please retry", headers=PRIVATE_HEADERS) from None


@router.put("", response_model=ProfileResponse)
async def put_profile(payload: ProfileUpdate, response: Response, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    response.headers.update(PRIVATE_HEADERS)
    values = payload.model_dump()
    try:
        statement = insert(UserProfile).values(user_id=UUID(user["sub"]), **values)
        result = await db.execute(statement.on_conflict_do_update(
            index_elements=["user_id"], set_={**values, "updated_at": func.now()},
        ).returning(UserProfile.updated_at))
        updated_at = result.scalar_one()
        await db.commit()
        return ProfileResponse(**values, updated_at=updated_at)
    except IntegrityError as error:
        await db.rollback()
        constraint = getattr(getattr(error.orig, "diag", None), "constraint_name", None)
        # asyncpg wraps the underlying constraint details; SQLite is used in isolated tests.
        if constraint == "user_profile_username_key" or "user_profile_username_key" in str(error.orig) or "UNIQUE constraint failed: user_profile.username" in str(error.orig):
            raise HTTPException(409, "This username is already taken.", headers=PRIVATE_HEADERS) from None
        logger.error("Unable to save profile due to a database constraint")
        raise HTTPException(500, "Unable to save profile; please retry", headers=PRIVATE_HEADERS) from None
    except SQLAlchemyError:
        await db.rollback()
        logger.error("Unable to save profile")
        raise HTTPException(500, "Unable to save profile; please retry", headers=PRIVATE_HEADERS) from None
