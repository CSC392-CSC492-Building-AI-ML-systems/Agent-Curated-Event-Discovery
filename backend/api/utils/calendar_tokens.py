import hashlib
import os
import re
import secrets
from urllib.parse import urlsplit


def generate_calendar_token() -> str:
    return secrets.token_urlsafe(32)


def valid_calendar_token(token: str) -> bool:
    return re.fullmatch(r"[A-Za-z0-9_-]{43}", token) is not None


def hash_calendar_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def calendar_feed_base_url() -> str:
    base = os.getenv("CALENDAR_FEED_BASE_URL", "http://localhost:8000").strip().rstrip("/")
    try:
        parts = urlsplit(base)
        local = parts.hostname in {"localhost", "127.0.0.1", "::1"}
        valid = (
            bool(parts.hostname)
            and (parts.scheme == "https" or (local and parts.scheme == "http"))
            and parts.username is None and parts.password is None
            and not parts.query and not parts.fragment
        )
        # Accessing port validates malformed port numbers as well.
        parts.port
    except ValueError:
        valid = False
    if not valid:
        raise ValueError("Set CALENDAR_FEED_BASE_URL to the HTTPS backend URL, or HTTP localhost for development.")
    return base
