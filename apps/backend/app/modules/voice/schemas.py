from pydantic import BaseModel


class VoiceSession(BaseModel):
    """What the app needs to open one voice conversation with the assistant."""

    conversation_token: str
