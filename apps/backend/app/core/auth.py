from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.core.config import get_settings

_bearer = HTTPBearer(auto_error=False)
# Fetches and caches the public keys published by the auth service.
_jwks = jwt.PyJWKClient(get_settings().auth_jwks_url)


class User(BaseModel):
    id: str
    email: str
    name: str


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    """Authenticate the request from the access token issued by the auth service.

    Declared sync on purpose: FastAPI runs it in a thread, so a JWKS refresh never
    blocks the event loop.
    """
    if credentials is None:
        raise _unauthorized("Missing access token")
    settings = get_settings()
    try:
        key = _jwks.get_signing_key_from_jwt(credentials.credentials)
        claims = jwt.decode(
            credentials.credentials,
            key,
            algorithms=["EdDSA"],
            issuer=settings.better_auth_url,
            audience=settings.better_auth_url,
            options={"require": ["exp", "sub", "email", "name"]},
        )
    except jwt.PyJWKClientConnectionError as error:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Auth service unreachable"
        ) from error
    except jwt.PyJWTError as error:
        raise _unauthorized("Invalid access token") from error
    return User(id=claims["sub"], email=claims["email"], name=claims["name"])


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status.HTTP_401_UNAUTHORIZED, detail, headers={"WWW-Authenticate": "Bearer"}
    )


CurrentUser = Annotated[User, Depends(get_current_user)]
