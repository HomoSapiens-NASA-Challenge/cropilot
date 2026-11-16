import re
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

_bearer = HTTPBearer(auto_error=False)
# Same rule as `handleFromName` in packages/api: 2 to 40 lowercase letters, digits and
# inner hyphens.
_HANDLE = re.compile(r"[a-z0-9][a-z0-9-]{0,38}[a-z0-9]")


class User(BaseModel):
    id: str


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    """The reader's handle, sent as the bearer credential.

    Cropilot has no accounts: the handle the reader typed is the user id, so anyone who
    types the same name opens the same workspace. It identifies, it does not authenticate.
    """
    if credentials is None:
        raise _unauthorized("Missing user handle")
    if not _HANDLE.fullmatch(credentials.credentials):
        raise _unauthorized("Invalid user handle")
    return User(id=credentials.credentials)


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status.HTTP_401_UNAUTHORIZED, detail, headers={"WWW-Authenticate": "Bearer"}
    )


CurrentUser = Annotated[User, Depends(get_current_user)]
