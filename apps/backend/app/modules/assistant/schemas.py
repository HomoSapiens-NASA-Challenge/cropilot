from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.modules.cases.schemas import SourceRef


class AssistantModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False, str_strip_whitespace=True)


class HistoryMessage(AssistantModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=6000)


class AssistantRequest(AssistantModel):
    zone_id: str = Field(min_length=1, max_length=80, pattern=r"^[a-z0-9-]+$")
    message: str = Field(min_length=1, max_length=2000)
    history: list[HistoryMessage] = Field(default_factory=list, max_length=8)
    speak: bool = False


class PlannerAssistantRequest(AssistantRequest):
    run_id: str = Field(min_length=1, max_length=80)


class AnswerClaim(AssistantModel):
    text: str = Field(min_length=1, max_length=1800)
    source_ids: list[str] = Field(min_length=1, max_length=8)


class ModelAnswer(AssistantModel):
    claims: list[AnswerClaim] = Field(min_length=1, max_length=6)
    limitations: list[str] = Field(max_length=5)
    suggested_questions: list[str] = Field(max_length=3)


class EvidenceCard(AssistantModel):
    title: str
    columns: list[str]
    rows: list[list[str | float | int | None]]
    provenance: str
    scale: str
    note: str
    source_ids: list[str]


class SpeechAudio(AssistantModel):
    audio_base64: str
    mime_type: Literal["audio/wav"] = "audio/wav"
    text: str
    model: str


class TranscriptionRequest(AssistantModel):
    audio_base64: str = Field(min_length=4, max_length=5_600_000)
    mime_type: Literal["audio/webm", "audio/mp4", "audio/ogg", "audio/wav"]


class TranscriptionResponse(AssistantModel):
    text: str
    model: str


class AssistantResponse(ModelAnswer):
    zone_id: str
    campaign: str
    generated_utc: str
    model: str
    run_id: str | None
    sources: list[SourceRef]
    cards: list[EvidenceCard]
    tools_used: list[str]
    speech: SpeechAudio | None = None
    speech_error: str | None = None
