"""Who sees a planner run, how a newer run supersedes an older one, and how failures surface."""

import threading
import time
from pathlib import Path
from uuid import uuid4

import pytest

from app.modules.rotation_planner import pipeline, service
from app.modules.rotation_planner.schemas import (
    STAGE_IDS,
    ConvergencePoint,
    PriorityWeights,
    RotationPlanRequest,
    RotationPlanResult,
    RotationPlanRun,
    RunStatus,
)


def request(horizon: int = 1) -> RotationPlanRequest:
    return RotationPlanRequest(
        weights=PriorityWeights(
            margin_usd_ha=1, deficit_mm=0, bare_days=0, bare_rain_mm=0, drainage_mm=0
        ),
        horizon_campaigns=horizon,
    )


def wait_for(owner_id: str, run_id: str, status: RunStatus) -> RotationPlanRun:
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        run = service.get_rotation_plan(owner_id, run_id)
        if run.status == status:
            return run
        time.sleep(0.01)
    raise AssertionError(f"Run {run_id} never reached {status}")


@pytest.fixture
def inputs_present(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(pipeline, "ensure_inputs", lambda: None)


@pytest.mark.usefixtures("inputs_present")
def test_a_run_belongs_to_the_user_who_started_it(monkeypatch: pytest.MonkeyPatch) -> None:
    def fail(
        region_id: str, request: RotationPlanRequest, progress: pipeline.ProgressReporter
    ) -> RotationPlanResult:
        raise RuntimeError("stop here")

    monkeypatch.setattr(pipeline, "run", fail)
    owner, other = f"owner-{uuid4().hex}", f"other-{uuid4().hex}"

    started = service.start_rotation_plan(owner, "pergamino", request())

    assert started.status == "queued"
    assert [stage.stage_id for stage in started.stages] == list(STAGE_IDS)
    assert service.get_rotation_plan(owner, started.run_id).run_id == started.run_id
    with pytest.raises(service.RunNotFoundError):
        service.get_rotation_plan(other, started.run_id)
    with pytest.raises(service.RunNotFoundError):
        service.get_rotation_plan(owner, uuid4().hex)
    wait_for(owner, started.run_id, "failed")


@pytest.mark.usefixtures("inputs_present")
def test_a_failed_run_keeps_what_it_reported_and_the_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    point = ConvergencePoint(seed=0, episodes=500, agent_score=0.25, agreement_share=0.5)

    def report_then_fail(
        region_id: str, request: RotationPlanRequest, progress: pipeline.ProgressReporter
    ) -> RotationPlanResult:
        progress.start_stage("simulate", 3, "campaigns")
        progress.advance("simulate", 2)
        progress.finish_stage("simulate")
        progress.set_optimal_score(1.5)
        progress.add_checkpoint(point)
        raise RuntimeError("the simulator broke")

    monkeypatch.setattr(pipeline, "run", report_then_fail)
    owner = f"owner-{uuid4().hex}"

    started = service.start_rotation_plan(owner, "pergamino", request())
    run = wait_for(owner, started.run_id, "failed")

    assert run.error == "the simulator broke"
    assert run.result is None
    simulate = run.stages[0]
    assert (simulate.status, simulate.completed, simulate.total) == ("done", 3, 3)
    assert simulate.elapsed_ms is not None
    assert all(stage.status == "pending" for stage in run.stages[1:])
    assert run.optimal_score == 1.5
    assert run.convergence == [point]


@pytest.mark.usefixtures("inputs_present")
def test_a_newer_run_of_the_same_user_cancels_the_older_one(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    release = threading.Event()

    def run_once(
        region_id: str, request: RotationPlanRequest, progress: pipeline.ProgressReporter
    ) -> RotationPlanResult:
        if request.horizon_campaigns == 1:
            release.wait(10)
            progress.start_stage("simulate", 1, "campaigns")
            raise AssertionError("A superseded run must stop at its next report")
        raise RuntimeError("the newer run was not cancelled")

    monkeypatch.setattr(pipeline, "run", run_once)
    owner = f"owner-{uuid4().hex}"

    older = service.start_rotation_plan(owner, "pergamino", request(horizon=1))
    newer = service.start_rotation_plan(owner, "pergamino", request(horizon=2))
    release.set()

    assert wait_for(owner, older.run_id, "cancelled").error is None
    assert wait_for(owner, newer.run_id, "failed").error == "the newer run was not cancelled"


def test_missing_simulator_inputs_are_reported(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv("ROTATION_SIM_DATA_DIR", str(tmp_path))

    with pytest.raises(pipeline.SimulatorDataError, match=r"install\.sh"):
        pipeline.ensure_inputs()
