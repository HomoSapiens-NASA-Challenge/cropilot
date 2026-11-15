import io
import json
from urllib.error import URLError
from urllib.request import Request

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.modules.voice import service

API_KEY = "xi-test-key"
AGENT_ID = "agent_test"


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())


@pytest.fixture
def configured(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ELEVENLABS_API_KEY", API_KEY)
    monkeypatch.setenv("ELEVENLABS_AGENT_ID", AGENT_ID)


def test_session_returns_the_token_and_never_the_key(
    client: TestClient, configured: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    seen: list[Request] = []

    def fake_urlopen(request: Request, timeout: float) -> io.BytesIO:
        seen.append(request)
        return io.BytesIO(json.dumps({"token": "short-lived"}).encode())

    monkeypatch.setattr(service, "urlopen", fake_urlopen)
    response = client.post("/api/voice/session")

    assert response.status_code == 200
    assert response.json() == {"conversation_token": "short-lived"}
    assert API_KEY not in response.text
    assert seen[0].get_header("Xi-api-key") == API_KEY
    assert f"agent_id={AGENT_ID}" in seen[0].full_url


def test_session_without_configuration_is_unavailable(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)
    monkeypatch.delenv("ELEVENLABS_AGENT_ID", raising=False)
    monkeypatch.setattr(service.VoiceSettings, "model_config", {"env_file": None})
    assert client.post("/api/voice/session").status_code == 503


def test_session_when_the_provider_fails(
    client: TestClient, configured: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    def failing_urlopen(request: Request, timeout: float) -> io.BytesIO:
        raise URLError("down")

    monkeypatch.setattr(service, "urlopen", failing_urlopen)
    assert client.post("/api/voice/session").status_code == 502


def test_session_when_the_provider_answers_without_token(
    client: TestClient, configured: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(service, "urlopen", lambda request, timeout: io.BytesIO(b"{}"))
    assert client.post("/api/voice/session").status_code == 502
