from datetime import UTC, datetime, timedelta

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi import FastAPI
from fastapi.testclient import TestClient
from jwt.algorithms import OKPAlgorithm

from app.core import auth
from app.core.auth import CurrentUser, User

ISSUER = "http://auth.test"
KEY_ID = "test-key"


@pytest.fixture
def private_key(monkeypatch: pytest.MonkeyPatch) -> Ed25519PrivateKey:
    """Stand in for the auth service: sign with a local key and publish its public half."""
    key = Ed25519PrivateKey.generate()
    public_jwk = {**OKPAlgorithm.to_jwk(key.public_key(), as_dict=True), "kid": KEY_ID}
    jwks = jwt.PyJWKClient(f"{ISSUER}/api/auth/jwks")
    monkeypatch.setattr(jwks, "fetch_data", lambda: {"keys": [public_jwk]})
    monkeypatch.setattr(auth, "_jwks", jwks)
    return key


@pytest.fixture
def client() -> TestClient:
    app = FastAPI()

    @app.get("/me")
    def read_me(user: CurrentUser) -> User:
        return user

    return TestClient(app)


def make_token(key: Ed25519PrivateKey, **overrides: object) -> str:
    claims = {
        "sub": "user-1",
        "email": "ada@example.com",
        "name": "Ada",
        "iss": ISSUER,
        "aud": ISSUER,
        "exp": datetime.now(UTC) + timedelta(minutes=5),
        **overrides,
    }
    return jwt.encode(claims, key, algorithm="EdDSA", headers={"kid": KEY_ID})


def get_me(client: TestClient, token: str) -> int:
    return client.get("/me", headers={"Authorization": f"Bearer {token}"}).status_code


def test_valid_token_returns_the_user(client: TestClient, private_key: Ed25519PrivateKey) -> None:
    response = client.get("/me", headers={"Authorization": f"Bearer {make_token(private_key)}"})

    assert response.status_code == 200
    assert response.json() == {"id": "user-1", "email": "ada@example.com", "name": "Ada"}


def test_missing_token_is_rejected(client: TestClient) -> None:
    assert client.get("/me").status_code == 401


def test_expired_token_is_rejected(client: TestClient, private_key: Ed25519PrivateKey) -> None:
    expired = make_token(private_key, exp=datetime.now(UTC) - timedelta(minutes=1))

    assert get_me(client, expired) == 401


@pytest.mark.parametrize("claim", ["iss", "aud"])
def test_token_for_another_service_is_rejected(
    client: TestClient, private_key: Ed25519PrivateKey, claim: str
) -> None:
    assert get_me(client, make_token(private_key, **{claim: "http://other.test"})) == 401


def test_token_signed_by_another_key_is_rejected(
    client: TestClient, private_key: Ed25519PrivateKey
) -> None:
    forged = make_token(Ed25519PrivateKey.generate())

    assert get_me(client, forged) == 401
