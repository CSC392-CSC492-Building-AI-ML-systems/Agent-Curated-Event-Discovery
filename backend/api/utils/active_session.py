"""Reject revoked/deleted Auth sessions without relying on JWT expiry alone."""
import logging
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def require_active_session(claims: dict, db: AsyncSession) -> None:
    try:
        user_id = UUID(claims["sub"])
        session_id = UUID(claims["session_id"])
    except (KeyError, TypeError, ValueError, AttributeError):
        raise HTTPException(401, "Invalid or expired session") from None
    try:
        result = await db.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM auth.sessions
                WHERE id = CAST(:session_id AS uuid) AND user_id = CAST(:user_id AS uuid)
                  AND (not_after IS NULL OR not_after > CURRENT_TIMESTAMP)
            )
        """), {"session_id": str(session_id), "user_id": str(user_id)})
        if not result.scalar_one():
            raise HTTPException(401, "Invalid or expired session")
    except SQLAlchemyError:
        logger.error("Unable to check active authentication session")
        raise HTTPException(503, "Unable to verify your session; please retry") from None
