import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import BigInteger, delete, func, insert, literal, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_db
from ..models.availability import UserAvailability
from ..schemas.availability import AvailabilityWindow, WeeklyAvailability
from ..utils.auth import get_current_user

router = APIRouter(prefix="/users/me/availability", tags=["Availability"])
logger = logging.getLogger(__name__)
PRIVATE_HEADERS = {"Cache-Control": "private, no-store"}


@router.get("", response_model=WeeklyAvailability)
async def get_availability(
    response: Response,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    response.headers.update(PRIVATE_HEADERS)
    try:
        result = await db.execute(
            select(UserAvailability.day_of_week, UserAvailability.start_minute, UserAvailability.end_minute)
            .where(UserAvailability.user_id == UUID(user["sub"]))
            .order_by(UserAvailability.day_of_week, UserAvailability.start_minute)
        )
        return WeeklyAvailability(windows=[
            AvailabilityWindow(day_of_week=day, start_minute=start, end_minute=end)
            for day, start, end in result.all()
        ])
    except SQLAlchemyError:
        logger.error("Unable to load weekly availability")
        raise HTTPException(500, detail="Unable to load availability; please retry", headers=PRIVATE_HEADERS) from None


@router.put("", response_model=WeeklyAvailability)
async def put_availability(
    payload: WeeklyAvailability,
    response: Response,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    response.headers.update(PRIVATE_HEADERS)
    user_id = UUID(user["sub"])
    try:
        # A transaction-scoped lock serializes replacements for this user even
        # when their schedule is empty and there are no rows to lock.
        lock_key = user_id.int % (1 << 63)
        await db.execute(select(func.pg_advisory_xact_lock(literal(lock_key, type_=BigInteger))))
        await db.execute(delete(UserAvailability).where(UserAvailability.user_id == user_id))
        if payload.windows:
            await db.execute(insert(UserAvailability), [
                {"user_id": user_id, **window.model_dump()} for window in payload.windows
            ])
        await db.commit()
    except SQLAlchemyError:
        await db.rollback()
        logger.error("Unable to save weekly availability")
        raise HTTPException(500, detail="Unable to save availability; please retry", headers=PRIVATE_HEADERS) from None
    return payload
