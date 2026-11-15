"""Mints short-lived ElevenLabs conversation tokens. The API key never leaves the backend."""

import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.config import ROOT_ENV_FILE
from app.modules.voice.schemas import VoiceSession

TOKEN_URL = "https://api.elevenlabs.io/v1/convai/conversation/token"
TIMEOUT_S = 10


class VoiceSettings(BaseSettings):
    """Optional: without them the rest of the API runs and only the voice session fails."""

    model_config = SettingsConfigDict(env_file=ROOT_ENV_FILE, extra="ignore")

    elevenlabs_api_key: str | None = None
    elevenlabs_agent_id: str | None = None


class VoiceNotConfiguredError(Exception):
    """The ElevenLabs key or agent id is missing from the environment."""


class VoiceProviderError(Exception):
    """ElevenLabs did not return a usable token."""


def create_voice_session() -> VoiceSession:
    settings = VoiceSettings()
    if not settings.elevenlabs_api_key or not settings.elevenlabs_agent_id:
        raise VoiceNotConfiguredError("Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID")
    request = Request(
        f"{TOKEN_URL}?{urlencode({'agent_id': settings.elevenlabs_agent_id})}",
        headers={"xi-api-key": settings.elevenlabs_api_key},
    )
    try:
        with urlopen(request, timeout=TIMEOUT_S) as response:
            body = json.load(response)
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        raise VoiceProviderError("ElevenLabs token request failed") from error
    token = body.get("token") if isinstance(body, dict) else None
    if not isinstance(token, str) or not token:
        raise VoiceProviderError("ElevenLabs answered without a token")
    return VoiceSession(conversation_token=token)
