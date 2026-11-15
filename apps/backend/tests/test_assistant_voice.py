import base64
import io
import shutil
import wave

import pytest
from fastapi.testclient import TestClient

from app.core.config import AssistantSettings
from app.main import create_app
from app.modules.assistant import service, voice
from app.modules.assistant.schemas import (
    AnswerClaim,
    AssistantRequest,
    ModelAnswer,
    SpeechAudio,
    TranscriptionRequest,
)


def test_public_transcription_disabled_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ASSISTANT_PUBLIC_ENABLED", "false")
    response = TestClient(create_app()).post(
        "/api/assistant/transcriptions",
        json={
            "audio_base64": "YXVkaW8=",
            "mime_type": "audio/webm",
        },
    )
    assert response.status_code == 503


def test_private_transcription_requires_authentication() -> None:
    response = TestClient(create_app()).post(
        "/api/assistant/private-transcriptions",
        json={
            "audio_base64": "YXVkaW8=",
            "mime_type": "audio/webm",
        },
    )
    assert response.status_code == 401


@pytest.mark.parametrize(
    ("encoded", "mime"),
    [
        ("not base64", "audio/webm"),
        ("YXVkaW8=", "audio/webm"),
        (base64.b64encode(b"RIFF0000WAVE").decode(), "audio/ogg"),
    ],
)
def test_invalid_audio_rejected_before_provider(encoded: str, mime: str) -> None:
    request = TranscriptionRequest.model_validate({"audio_base64": encoded, "mime_type": mime})
    with pytest.raises(voice.VoiceError):
        voice.decode_audio(request)


def test_audio_size_limit_precedes_provider() -> None:
    encoded = base64.b64encode(b"RIFF0000WAVE" + b"0" * voice.MAX_AUDIO_BYTES).decode()
    with pytest.raises(voice.VoiceError, match="4 MB"):
        voice.decode_audio(TranscriptionRequest(audio_base64=encoded, mime_type="audio/wav"))


def test_wav_has_browser_compatible_format() -> None:
    pcm = b"\x00\x00" * 2400
    data = voice.pcm_to_wav(pcm)
    with wave.open(io.BytesIO(data), "rb") as recording:
        assert recording.getframerate() == 24000
        assert recording.getnchannels() == 1
        assert recording.getsampwidth() == 2
        assert recording.readframes(2400) == pcm


def test_speech_failure_preserves_cited_answer(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ASSISTANT_PUBLIC_ENABLED", "true")
    monkeypatch.setenv("OPENAI_API_KEY", "test-only")

    def answer(*args: object, **kwargs: object) -> ModelAnswer:
        return ModelAnswer(
            claims=[AnswerClaim(text="Published evidence", source_ids=["nasa_power"])],
            limitations=[],
            suggested_questions=[],
        )

    def fail(_: str, settings: AssistantSettings) -> SpeechAudio:
        raise voice.VoiceError("Speech is unavailable")

    monkeypatch.setattr(service, "_respond", answer)
    monkeypatch.setattr(voice, "read_aloud", fail)
    response = service.answer_message(
        AssistantRequest(zone_id="pergamino", message="Explain", speak=True)
    )
    assert response.claims[0].text == "Published evidence"
    assert response.sources
    assert response.speech is None
    assert response.speech_error == "Speech is unavailable"


def test_no_audio_charge_when_spoken_reply_is_off(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ASSISTANT_PUBLIC_ENABLED", "true")
    monkeypatch.setenv("OPENAI_API_KEY", "test-only")

    def answer(*args: object, **kwargs: object) -> ModelAnswer:
        return ModelAnswer(
            claims=[AnswerClaim(text="Evidence", source_ids=["nasa_power"])],
            limitations=[],
            suggested_questions=[],
        )

    def unexpected(*args: object, **kwargs: object) -> None:
        pytest.fail("Speech must not be called for a text-only request")

    monkeypatch.setattr(service, "_respond", answer)
    monkeypatch.setattr(voice, "read_aloud", unexpected)
    response = service.answer_message(AssistantRequest(zone_id="pergamino", message="Explain"))
    assert response.speech is None


def test_spoken_excerpt_cannot_change_the_numbers() -> None:
    voice.validate_spoken_excerpt("Menor déficit: 55 mm.", "Menor déficit: 55 mm!")
    with pytest.raises(voice.VoiceError, match="match"):
        voice.validate_spoken_excerpt("Menor déficit: 55 mm.", "Menor déficit: 5 mm.")
    with pytest.raises(voice.VoiceError, match="match"):
        voice.validate_spoken_excerpt("Diferencia: -55 mm.", "Diferencia: +55 mm.")


@pytest.mark.parametrize(
    ("expected", "spoken"),
    [("Margin < 5 USD/ha", "Margin > 5 USD/ha"), ("Deficit - 55 mm", "Deficit 55 mm")],
)
def test_spoken_excerpt_preserves_comparisons_and_separated_signs(
    expected: str, spoken: str
) -> None:
    with pytest.raises(voice.VoiceError, match="match"):
        voice.validate_spoken_excerpt(expected, spoken)


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="FFmpeg is required for voice decoding")
def test_long_low_bitrate_recording_rejected_before_provider() -> None:
    output = io.BytesIO()
    with wave.open(output, "wb") as recording:
        recording.setnchannels(1)
        recording.setsampwidth(2)
        recording.setframerate(8000)
        recording.writeframes(b"\x00\x00" * 8000 * 120)
    request = TranscriptionRequest(
        audio_base64=base64.b64encode(output.getvalue()).decode(), mime_type="audio/wav"
    )
    with pytest.raises(voice.VoiceError, match="60 seconds"):
        voice.normalize_recording(request)
