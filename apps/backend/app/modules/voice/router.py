"""Voice sessions with the case assistant. Public like the case it talks about."""

import logging

from fastapi import APIRouter, HTTPException

from app.modules.voice import service
from app.modules.voice.schemas import VoiceSession

router = APIRouter(prefix="/voice", tags=["voice"])
logger = logging.getLogger(__name__)


@router.post("/session", response_model=VoiceSession)
def create_voice_session() -> VoiceSession:
    """A short-lived token to open one voice conversation with the case assistant."""
    try:
        return service.create_voice_session()
    except service.VoiceNotConfiguredError as error:
        logger.exception("Voice assistant not configured")
        raise HTTPException(503, "Voice assistant unavailable; contact the operator") from error
    except service.VoiceProviderError as error:
        logger.exception("Voice provider failed")
        raise HTTPException(502, "Voice provider unavailable; try again") from error
