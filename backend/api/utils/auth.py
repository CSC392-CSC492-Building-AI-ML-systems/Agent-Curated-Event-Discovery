"""Verify Supabase user access tokens using the project's public signing keys."""

import os
from functools import lru_cache
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

bearer_scheme = HTTPBearer(auto_error=False)


@lru_cache(maxsize=4)
def get_jwks_client(project_url: str) -> PyJWKClient:
    return PyJWKClient(
        f"{project_url}/auth/v1/.well-known/jwks.json",
        cache_jwk_set=True,
        lifespan=600,
        timeout=5,
    )


def verify_token(token: str) -> dict:
    project_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    if not project_url:
        raise HTTPException(status_code=503, detail="Authentication is not configured")

    signing_key = get_jwks_client(project_url).get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["ES256", "RS256"],
        audience="authenticated",
        issuer=f"{project_url}/auth/v1",
        options={"require": ["exp", "sub", "iss", "aud"]},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    unauthorized = HTTPException(
        status_code=401,
        detail="Invalid or expired session",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    try:
        claims = verify_token(credentials.credentials)
        if claims.get("role") != "authenticated":
            raise unauthorized
        UUID(claims["sub"])
        return claims
    except jwt.PyJWKClientConnectionError:
        raise HTTPException(status_code=503, detail="Authentication service unavailable") from None
    except (jwt.InvalidTokenError, jwt.PyJWKClientError, ValueError, KeyError, TypeError):
        raise unauthorized from None
