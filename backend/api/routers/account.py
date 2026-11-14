import logging
import os
from collections.abc import AsyncIterator
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_db
from ..utils.auth import get_current_user
from ..utils.account_deletion import require_cascade_cleanup, require_counter_cleanup, require_recent_sign_in

router = APIRouter(prefix="/users/me/account", tags=["Account"])
logger = logging.getLogger(__name__)
PRIVATE_HEADERS = {"Cache-Control": "private, no-store"}


@router.get("/security")
async def get_security(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Provider identities do not tell us whether an OAuth user has set a password.
    # Return only a boolean; password hashes must never leave the database.
    try:
        result = await db.execute(text("SELECT COALESCE(encrypted_password, '') <> '' FROM auth.users WHERE id = :user_id"),
                                  {"user_id": str(UUID(user["sub"]))})
        has_password = result.scalar_one_or_none()
    except SQLAlchemyError:
        raise HTTPException(503, "Unable to load account security; please retry", headers=PRIVATE_HEADERS) from None
    if has_password is None:
        raise HTTPException(401, "Please log in again", headers=PRIVATE_HEADERS)
    return JSONResponse({"has_password": bool(has_password)}, headers=PRIVATE_HEADERS)


async def get_auth_admin_client() -> AsyncIterator[httpx.AsyncClient]:
    url = os.getenv("SUPABASE_URL", "").rstrip("/")
    key = os.getenv("SUPABASE_SECRET_KEY", "")
    if not url or not key.startswith("sb_secret_"):
        raise HTTPException(503, "Account deletion is not configured", headers=PRIVATE_HEADERS)
    # Modern secret keys are sent only as apikey, never as a Bearer JWT.
    async with httpx.AsyncClient(base_url=f"{url}/auth/v1/", headers={"apikey": key, "Accept": "application/json"},
                                 timeout=10, follow_redirects=False) as client:
        yield client


@router.delete("", status_code=204)
async def delete_account(
    request: Request,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    admin: httpx.AsyncClient = Depends(get_auth_admin_client),
):
    if request.query_params or await request.body():
        raise HTTPException(422, "This endpoint does not accept an account ID or request body", headers=PRIVATE_HEADERS)
    require_recent_sign_in(user)
    user_id = str(UUID(user["sub"]))
    try:
        await require_cascade_cleanup(db)
        await require_counter_cleanup(db)
        # Release the read-only preflight transaction before calling Auth.
        await db.rollback()
    except SQLAlchemyError:
        await db.rollback()
        logger.error("Unable to verify account deletion cleanup")
        raise HTTPException(503, "Unable to verify account cleanup; please retry", headers=PRIVATE_HEADERS) from None
    try:
        result = await admin.request("DELETE", f"admin/users/{user_id}", json={"should_soft_delete": False})
    except httpx.RequestError:
        logger.error("Unable to reach account deletion service")
        raise HTTPException(502, "Unable to confirm account deletion; please retry", headers=PRIVATE_HEADERS) from None
    if not result.is_success:
        # Do not expose upstream responses, SQL errors, headers, or secrets.
        logger.error("Account deletion service rejected the request")
        raise HTTPException(502, "Unable to delete your account; please retry", headers=PRIVATE_HEADERS)
    return Response(status_code=204, headers=PRIVATE_HEADERS)
