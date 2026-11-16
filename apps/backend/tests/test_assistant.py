import json
import time
from uuid import uuid4

import httpx2
import pytest
from fastapi.testclient import TestClient
from openai import OpenAI
from pydantic import ValidationError

from app.core.auth import User, get_current_user
from app.core.config import RotationSimSettings
from app.main import create_app
from app.modules.assistant import service
from app.modules.assistant.schemas import AnswerClaim, AssistantRequest, ModelAnswer
from app.modules.assistant.tools import EvidenceError, EvidenceSession
from app.modules.cases import service as cases_service
from app.modules.rotation_planner import service as planner_service
from app.modules.rotation_planner.schemas import PriorityWeights, RotationPlanRequest


def test_public_assistant_is_disabled_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ASSISTANT_PUBLIC_ENABLED", "false")
    response = TestClient(create_app()).post(
        "/api/assistant/messages",
        json={"zone_id": "pergamino", "message": "Compare rotations", "history": []},
    )
    assert response.status_code == 503
    assert "disabled" in response.json()["detail"].lower()


def test_exact_water_cards_match_released_values() -> None:
    evidence = EvidenceSession("pergamino")
    evidence.context()
    data = json.loads(
        evidence.execute(
            "compare_rotations",
            json.dumps({"depth_m": 1.0, "initial_water_fraction": 0.5, "summer_shift_days": 7}),
        )
    )
    bundle = cases_service.get_case("pergamino")
    assert bundle.compare.water is not None
    expected = [
        r
        for r in bundle.compare.water.episodes
        if r.scenario_id is not None
        and r.depth_m == 1.0
        and r.initial_water_fraction == 0.5
        and r.summer_shift_days == 7
    ]
    assert expected
    assert len(data["water"]["episodes"]) == len(expected)
    assert "different reference" in data["selection_note"]
    assert "Zero difference does not mean zero deficit" in data["selection_note"]
    assert evidence.cards[0].rows == [
        [r.start_year, r.strategy_id, r.crop_et_deficit_mm, r.excess_above_capacity_mm]
        for r in expected
    ]


def test_unsupported_selection_does_not_substitute() -> None:
    evidence = EvidenceSession("pergamino")
    response = json.loads(
        evidence.execute(
            "compare_rotations",
            json.dumps({"depth_m": 0.6, "initial_water_fraction": 0.25, "summer_shift_days": 7}),
        )
    )
    assert response["status"] == "invalid_selection"
    assert not evidence.cards


def test_missing_water_is_missing_not_another_zone() -> None:
    zone = next(
        z.zone_id
        for z in cases_service.get_case_index().zones
        if z.modules.water == "not_available"
    )
    evidence = EvidenceSession(zone)
    data = json.loads(
        evidence.execute(
            "compare_rotations",
            json.dumps({"depth_m": 1, "initial_water_fraction": 0.5, "summer_shift_days": 0}),
        )
    )
    assert data["water"] is None
    assert data["context"]["zone_id"] == zone


def test_unknown_citations_are_rejected() -> None:
    evidence = EvidenceSession("pergamino")
    evidence.context()
    answer = ModelAnswer(
        claims=[AnswerClaim(text="Invented", source_ids=["fake-source"])],
        limitations=[],
        suggested_questions=[],
    )
    with pytest.raises(EvidenceError, match="unknown source"):
        service.validate_answer(answer, evidence)


def test_each_claim_requires_its_own_citation() -> None:
    with pytest.raises(ValidationError):
        ModelAnswer.model_validate(
            {
                "claims": [
                    {"text": "Supported", "source_ids": ["nasa_power"]},
                    {"text": "An uncited number: 999", "source_ids": []},
                ],
                "limitations": [],
                "suggested_questions": [],
            }
        )


def test_public_payload_cannot_smuggle_private_run() -> None:
    response = TestClient(create_app()).post(
        "/api/assistant/messages",
        json={"zone_id": "pergamino", "message": "Read it", "run_id": "private-run"},
    )
    assert response.status_code == 422


def test_planner_chat_requires_login() -> None:
    response = TestClient(create_app()).post(
        "/api/assistant/planner-messages",
        json={"zone_id": "pergamino", "message": "Explain", "run_id": "someone-elses-run"},
    )
    assert response.status_code == 401


def test_planner_uses_server_owner_before_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: User(id="alice")
    monkeypatch.setenv("OPENAI_API_KEY", "test-only-not-a-real-key")
    calls = []

    def missing_run(owner_id: str, run_id: str) -> None:
        calls.append((owner_id, run_id))
        raise planner_service.RunNotFoundError(run_id)

    monkeypatch.setattr(planner_service, "get_rotation_plan", missing_run)
    response = TestClient(app).post(
        "/api/assistant/planner-messages",
        json={"zone_id": "pergamino", "message": "Explain", "run_id": "bob-run"},
    )
    assert response.status_code == 404
    assert calls == [("alice", "bob-run")]


@pytest.mark.skipif(
    not (RotationSimSettings().rotation_sim_data_dir / "fields.json").is_file(),
    reason="Simulator inputs are not installed (scripts/rotation_sim/install.sh)",
)
def test_a_real_planner_run_fits_the_evidence_cap() -> None:
    # Every policy's per-campaign replays pushed a finished run past the tool cap, so each
    # planner question failed with "Evidence is too large".
    owner = f"owner-{uuid4().hex}"
    request = RotationPlanRequest(
        weights=PriorityWeights(
            margin_usd_ha=1, deficit_mm=1, bare_days=1, bare_rain_mm=1, drainage_mm=1
        ),
        horizon_campaigns=1,
    )
    run = planner_service.start_rotation_plan(owner, "pergamino", request)
    deadline = time.monotonic() + 120
    while planner_service.get_rotation_plan(owner, run.run_id).status != "done":
        assert time.monotonic() < deadline, "the planner run never finished"
        time.sleep(0.1)

    evidence = EvidenceSession("pergamino", owner, run.run_id)
    result = json.loads(evidence.execute("get_planner_result", "{}"))["result"]

    assert result["verdict"]["held_out"]
    assert all("lower_tail_margin_usd_ha" in p["test"] for p in result["policies"])


def test_usage_budget_and_concurrency_release() -> None:
    gate = service.UsageGate()
    with gate.enter(10), gate.enter(10), pytest.raises(service.AssistantBusyError), gate.enter(10):
        pass
    with gate.enter(10):
        pass
    with pytest.raises(service.AssistantBusyError), gate.enter(3):
        pass


def test_unknown_tool_and_extra_arguments_fail_closed() -> None:
    evidence = EvidenceSession("pergamino")
    with pytest.raises(EvidenceError, match="Unknown tool"):
        evidence.execute("read_file", "{}")
    result = json.loads(evidence.execute("find_analog_years", '{"zone_id":"other"}'))
    assert result["status"] == "invalid_selection"


def test_responses_tool_roundtrip_uses_real_evidence_and_no_storage() -> None:
    evidence = EvidenceSession("pergamino")
    context = evidence.context()
    request_count = 0

    def provider(request: httpx2.Request) -> httpx2.Response:
        nonlocal request_count
        body = json.loads(request.content)
        assert body["store"] is False
        request_count += 1
        if request_count == 1:
            assert body["tool_choice"] == "required"
            output = [
                {
                    "type": "function_call",
                    "id": "fc_1",
                    "call_id": "call_1",
                    "name": "find_analog_years",
                    "arguments": "{}",
                    "status": "completed",
                }
            ]
        else:
            result = next(
                item for item in body["input"] if item.get("type") == "function_call_output"
            )
            data = json.loads(result["output"])
            assert data["context"]["zone_id"] == "pergamino"
            assert data["years_like_this"]["campaigns"]
            answer = ModelAnswer(
                claims=[AnswerClaim(text="Historical scenarios.", source_ids=["nasa_power"])],
                limitations=[],
                suggested_questions=[],
            )
            output = [
                {
                    "type": "message",
                    "id": "msg_1",
                    "role": "assistant",
                    "status": "completed",
                    "content": [
                        {"type": "output_text", "text": answer.model_dump_json(), "annotations": []}
                    ],
                }
            ]
        return httpx2.Response(
            200,
            json={
                "id": "resp_1",
                "object": "response",
                "created_at": 1,
                "model": "test-model",
                "status": "completed",
                "output": output,
            },
        )

    with OpenAI(
        api_key="test-only", http_client=httpx2.Client(transport=httpx2.MockTransport(provider))
    ) as client:
        answer = service._respond(
            client,
            "test-model",
            AssistantRequest(zone_id="pergamino", message="Which analog years?"),
            evidence,
            context,
            None,
        )
    service.validate_answer(answer, evidence)
    assert request_count == 2
    assert evidence.tools_used == ["find_analog_years"]
    assert evidence.cards[0].rows


def test_tool_loop_stops_after_budget() -> None:
    count = 0

    def provider(_: httpx2.Request) -> httpx2.Response:
        nonlocal count
        count += 1
        return httpx2.Response(
            200,
            json={
                "id": f"resp_{count}",
                "object": "response",
                "created_at": 1,
                "model": "test-model",
                "status": "completed",
                "output": [
                    {
                        "type": "function_call",
                        "id": f"fc_{count}",
                        "call_id": f"call_{count}",
                        "name": "list_cases",
                        "arguments": "{}",
                        "status": "completed",
                    }
                ],
            },
        )

    evidence = EvidenceSession("pergamino")
    with (
        OpenAI(
            api_key="test-only", http_client=httpx2.Client(transport=httpx2.MockTransport(provider))
        ) as client,
        pytest.raises(EvidenceError, match="Tool limit"),
    ):
        service._respond(
            client,
            "test-model",
            AssistantRequest(zone_id="pergamino", message="Keep calling tools"),
            evidence,
            evidence.context(),
            None,
        )
    assert count == 4


def test_provider_failure_does_not_expose_provider_body(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ASSISTANT_PUBLIC_ENABLED", "true")
    monkeypatch.setenv("OPENAI_API_KEY", "test-only")

    def fail(*args: object, **kwargs: object) -> ModelAnswer:
        from openai import BadRequestError

        raise BadRequestError(
            "private provider debug text",
            response=httpx2.Response(
                400, request=httpx2.Request("POST", "https://api.openai.com/v1/responses")
            ),
            body={"debug": "private provider debug text"},
        )

    monkeypatch.setattr(service, "_respond", fail)
    response = TestClient(create_app()).post(
        "/api/assistant/messages", json={"zone_id": "pergamino", "message": "Compare"}
    )
    assert response.status_code == 503
    assert "private provider" not in response.text
