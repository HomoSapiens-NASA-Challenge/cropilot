import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.auth import CurrentUser, User


@pytest.fixture
def client() -> TestClient:
    app = FastAPI()

    @app.get("/me")
    def read_me(user: CurrentUser) -> User:
        return user

    return TestClient(app)


def test_the_handle_is_the_user(client: TestClient) -> None:
    response = client.get("/me", headers={"Authorization": "Bearer joaquin-leon"})

    assert response.status_code == 200
    assert response.json() == {"id": "joaquin-leon"}


def test_missing_handle_is_rejected(client: TestClient) -> None:
    assert client.get("/me").status_code == 401


@pytest.mark.parametrize("handle", ["a", "Joaquin", "-joaquin", "joaquin-", "a b", "x" * 41])
def test_a_handle_outside_the_shared_rule_is_rejected(client: TestClient, handle: str) -> None:
    response = client.get("/me", headers={"Authorization": f"Bearer {handle}"})

    assert response.status_code == 401
