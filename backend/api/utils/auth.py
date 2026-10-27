import os

import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from dotenv import load_dotenv

load_dotenv()

bearer_scheme = HTTPBearer()
SUPABASE_URL=os.getenv('SUPABASE_URL')
ISSUER=f"{SUPABASE_URL}/auth/v1"
JWKS_URL=f"{ISSUER}/.well-known/jwks.json"

jwks_client = PyJWKClient(JWKS_URL, cache_jwk_set=True, lifespan=600)


def verify_token(token: str) -> dict:
    signing_key = jwks_client.get_signing_key_from_jwt(token)

    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["ES256"],
        audience="authenticated",
        issuer=ISSUER,
        options={"require": ["exp", "sub", "iss", "aud"]}
    )


def get_current_user(
        credentials: HTTPAuthorizationCredentials | None= Depends(bearer_scheme)
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    try:
        claims = verify_token(credentials.credentials)
        if claims.get("role") != "authenticated":
            raise HTTPException(status_code=401, detail="Invalid token role")
        return claims
    except HTTPException:
        raise
    except (jwt.InvalidTokenError, jwt.PyJWKClientError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")