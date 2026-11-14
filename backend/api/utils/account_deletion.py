"""Deletion prerequisites; no user data is manually erased ahead of Auth deletion."""
import time

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

RECENT_SIGN_IN_SECONDS = 10 * 60
# These are the relationships described by the confirmation dialog.
CASCADE_TARGETS = {
    "user_profile": "auth.users",
    "user_preferences": "auth.users",
    "user_preference_tags": "public.user_preferences",
    "user_availability": "auth.users",
    "event_calendar": "auth.users",
    "calendar_subscription": "auth.users",
    "event_liked": "auth.users",
    "event_saved": "auth.users",
}


def require_recent_sign_in(claims: dict) -> None:
    now = time.time()
    methods = {"password", "oauth", "otp", "totp", "mfa/totp", "mfa/phone", "sso/saml"}
    amr = claims.get("amr")
    if isinstance(amr, list):
        for entry in amr:
            if not isinstance(entry, dict) or entry.get("method") not in methods:
                continue
            timestamp = entry.get("timestamp")
            if type(timestamp) in (int, float) and now - RECENT_SIGN_IN_SECONDS <= timestamp <= now + 30:
                return
    # Refreshing an old access token must not count as reauthentication.
    raise HTTPException(403, "Please log in again before deleting your account.")


async def require_cascade_cleanup(db: AsyncSession) -> None:
    result = await db.execute(text("""
        SELECT source.relname, target_schema.nspname || '.' || target.relname
        FROM pg_constraint c
        JOIN pg_class source ON source.oid = c.conrelid
        JOIN pg_namespace source_schema ON source_schema.oid = source.relnamespace
        JOIN pg_class target ON target.oid = c.confrelid
        JOIN pg_namespace target_schema ON target_schema.oid = target.relnamespace
        JOIN pg_attribute source_column ON source_column.attrelid = source.oid
          AND source_column.attnum = c.conkey[1]
        JOIN pg_attribute target_column ON target_column.attrelid = target.oid
          AND target_column.attnum = c.confkey[1]
        WHERE c.contype = 'f' AND c.confdeltype = 'c'
          AND source_schema.nspname = 'public'
          AND cardinality(c.conkey) = 1 AND cardinality(c.confkey) = 1
          AND source_column.attname = 'user_id'
          AND ((target_schema.nspname = 'auth' AND target.relname = 'users' AND target_column.attname = 'id')
            OR (target_schema.nspname = 'public' AND target.relname = 'user_preferences' AND target_column.attname = 'user_id'))
    """))
    relationships = set(result.all())
    if any((table, target) not in relationships for table, target in CASCADE_TARGETS.items()):
        raise HTTPException(503, "Account deletion is unavailable until account data cleanup is configured.")


async def require_counter_cleanup(db: AsyncSession) -> None:
    """Fail before Auth deletion if the counter-cleanup migration is missing."""
    result = await db.execute(text("""
        SELECT EXISTS (
            SELECT 1 FROM pg_trigger trigger
            JOIN pg_class target ON target.oid = trigger.tgrelid
            JOIN pg_namespace target_schema ON target_schema.oid = target.relnamespace
            JOIN pg_proc function ON function.oid = trigger.tgfoid
            JOIN pg_namespace function_schema ON function_schema.oid = function.pronamespace
            WHERE trigger.tgname = 'eventide_cleanup_deleted_user_counters'
              AND target_schema.nspname = 'auth' AND target.relname = 'users'
              AND function_schema.nspname = 'public'
              AND function.proname = 'cleanup_deleted_user_event_counters'
              AND function.prosecdef AND NOT trigger.tgisinternal
              AND trigger.tgenabled IN ('O', 'A') AND trigger.tgtype = 11
        )
    """))
    if not result.scalar_one():
        raise HTTPException(503, "Account deletion is unavailable until migration 006_account_counter_cleanup.sql is applied.")
