import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db.database import get_db
from ..models.calendar import CalendarEvent
from ..models.calendar_subscription import CalendarSubscription
from ..models.event import Event
from ..schemas.calendar_subscription import SubscriptionCreated, SubscriptionStatus
from ..utils.auth import get_current_user
from ..utils.calendar_feed import build_calendar_feed
from ..utils.calendar_tokens import (
    calendar_feed_base_url, generate_calendar_token, hash_calendar_token, valid_calendar_token,
)

router = APIRouter(tags=["Calendar subscriptions"])
logger = logging.getLogger(__name__)
PRIVATE_HEADERS = {"Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer"}


@router.get("/users/me/calendar-subscription", response_model=SubscriptionStatus)
async def subscription_status(
    response: Response,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    response.headers.update(PRIVATE_HEADERS)
    try:
        record = await db.scalar(select(CalendarSubscription).where(
            CalendarSubscription.user_id == UUID(user["sub"])
        ))
    except SQLAlchemyError:
        logger.exception("Unable to read calendar subscription")
        raise HTTPException(500, detail="Unable to load calendar subscription; please retry", headers=PRIVATE_HEADERS) from None
    return SubscriptionStatus(enabled=record is not None, created_at=record.created_at if record else None)


@router.post("/users/me/calendar-subscription", response_model=SubscriptionCreated)
async def create_subscription(
    response: Response,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    response.headers.update(PRIVATE_HEADERS)
    # Validate configuration before invalidating an existing link.
    try:
        base_url = calendar_feed_base_url()
    except ValueError as error:
        raise HTTPException(503, detail=str(error), headers=PRIVATE_HEADERS) from None
    token = generate_calendar_token()
    token_hash = hash_calendar_token(token)
    created = datetime.now(timezone.utc)
    try:
        await db.execute(
            insert(CalendarSubscription)
            .values(user_id=UUID(user["sub"]), token_hash=token_hash, created_at=created)
            .on_conflict_do_update(
                index_elements=["user_id"],
                set_={"token_hash": token_hash, "created_at": created},
            )
        )
        await db.commit()
    except SQLAlchemyError:
        await db.rollback()
        logger.exception("Unable to create calendar subscription")
        raise HTTPException(500, detail="Unable to create calendar subscription; please retry", headers=PRIVATE_HEADERS) from None
    return SubscriptionCreated(
        enabled=True, created_at=created,
        subscription_url=f"{base_url}/calendar/feeds/{token}/eventide-events.ics",
    )


@router.delete("/users/me/calendar-subscription", status_code=204)
async def disable_subscription(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await db.execute(delete(CalendarSubscription).where(
            CalendarSubscription.user_id == UUID(user["sub"])
        ))
        await db.commit()
    except SQLAlchemyError:
        await db.rollback()
        logger.exception("Unable to disable calendar subscription")
        raise HTTPException(500, detail="Unable to disable calendar subscription; please retry", headers=PRIVATE_HEADERS) from None
    return Response(status_code=204, headers=PRIVATE_HEADERS)


@router.get("/calendar/feeds/{token}/eventide-events.ics", include_in_schema=False)
async def calendar_feed(token: str, db: AsyncSession = Depends(get_db)):
    if not valid_calendar_token(token):
        raise HTTPException(404, detail="Calendar feed not found", headers=PRIVATE_HEADERS)
    try:
        owner = await db.scalar(select(CalendarSubscription.user_id).where(
            CalendarSubscription.token_hash == hash_calendar_token(token)
        ))
        if owner is None:
            raise HTTPException(404, detail="Calendar feed not found", headers=PRIVATE_HEADERS)
        result = await db.execute(
            select(Event)
            .join(CalendarEvent, CalendarEvent.event_id == Event.id)
            .where(CalendarEvent.user_id == owner)
            .options(selectinload(Event.venue_obj))
            .order_by(Event.startdate, Event.starttime, Event.id)
        )
        content = build_calendar_feed(list(result.scalars()))
    except SQLAlchemyError:
        # Never turn a database failure into an apparently empty calendar.
        logger.exception("Unable to read subscription calendar events")
        raise HTTPException(503, detail="Calendar feed temporarily unavailable", headers=PRIVATE_HEADERS) from None
    return Response(content=content, media_type="text/calendar", headers={
        **PRIVATE_HEADERS,
        "Content-Disposition": 'inline; filename="eventide-events.ics"',
    })
