from fastapi import APIRouter, HTTPException

from app.core.auth import CurrentUser
from app.modules.assistant import service
from app.modules.assistant.schemas import (
    AssistantRequest,
    AssistantResponse,
    PlannerAssistantRequest,
    TranscriptionRequest,
    TranscriptionResponse,
)
from app.modules.assistant.tools import EvidenceError
from app.modules.assistant.voice import VoiceError
from app.modules.cases.service import CaseDataError, CaseNotFoundError
from app.modules.rotation_planner.service import RunNotFoundError

router = APIRouter(prefix="/assistant", tags=["assistant"])


def _answer(
    data: AssistantRequest, owner_id: str | None = None, run_id: str | None = None
) -> AssistantResponse:
    try:
        return service.answer_message(data, owner_id, run_id)
    except (CaseNotFoundError, RunNotFoundError) as error:
        raise HTTPException(404, "Unknown case or run") from error
    except service.AssistantBusyError as error:
        raise HTTPException(429, str(error), headers={"Retry-After": "60"}) from error
    except service.AssistantUnavailableError as error:
        raise HTTPException(503, str(error)) from error
    except CaseDataError as error:
        raise HTTPException(503, "Published evidence is unavailable") from error
    except EvidenceError as error:
        raise HTTPException(422, str(error)) from error


@router.post("/messages", response_model=AssistantResponse)
def ask_case_assistant(data: AssistantRequest) -> AssistantResponse:
    """Opt-in, rate-limited public demonstration using only released case evidence."""
    return _answer(data)


@router.post("/planner-messages", response_model=AssistantResponse)
def ask_planner_assistant(data: PlannerAssistantRequest, user: CurrentUser) -> AssistantResponse:
    """Explain only a run owned by the authenticated caller; never start or modify a run."""
    return _answer(data, user.id, data.run_id)


def _transcribe(data: TranscriptionRequest, owner_id: str | None = None) -> TranscriptionResponse:
    try:
        return service.transcribe_message(data, owner_id)
    except service.AssistantBusyError as error:
        raise HTTPException(429, str(error), headers={"Retry-After": "60"}) from error
    except service.AssistantUnavailableError as error:
        raise HTTPException(503, str(error)) from error
    except VoiceError as error:
        raise HTTPException(422, str(error)) from error


@router.post("/transcriptions", response_model=TranscriptionResponse)
def transcribe_case_question(data: TranscriptionRequest) -> TranscriptionResponse:
    """Transcribe a short recording for user review; the shared public usage gate applies."""
    return _transcribe(data)


@router.post("/private-transcriptions", response_model=TranscriptionResponse)
def transcribe_private_question(
    data: TranscriptionRequest, user: CurrentUser
) -> TranscriptionResponse:
    """Authenticated voice input, independent of whether anonymous demo chat is enabled."""
    return _transcribe(data, user.id)
