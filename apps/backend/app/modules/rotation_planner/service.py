"""Runs of the rotation planner: an in-memory, per-process registry fed by one worker thread.

The worker publishes immutable `RotationPlanRun` snapshots; readers only ever see whole snapshots.
Runs live in memory, so production must stay at one API process. A restart drops them and the
client starts a new run.
"""

import logging
import threading
import time
from collections import OrderedDict
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

from app.modules.rotation_planner import kernel, pipeline
from app.modules.rotation_planner.schemas import (
    STAGE_IDS,
    ConvergencePoint,
    RotationPlanRequest,
    RotationPlanResult,
    RotationPlanRun,
    RotationPlanSetup,
    RunStatus,
    StageId,
    StageProgress,
)

logger = logging.getLogger(__name__)

MAX_RUNS = 32

_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="rotation-planner")
_lock = threading.Lock()
# run_id -> (owner_id, latest snapshot); oldest first.
_runs: OrderedDict[str, tuple[str, RotationPlanRun]] = OrderedDict()
_cancelled: set[str] = set()
_latest_by_owner: dict[str, str] = {}


class RunNotFoundError(Exception):
    def __init__(self, run_id: str) -> None:
        super().__init__(f"Unknown rotation plan run: {run_id}")


class RegionNotSimulatedError(Exception):
    def __init__(self, region_id: str) -> None:
        super().__init__(f"The simulator has no field for region: {region_id}")


class RunCancelledError(Exception):
    """The owner started a newer run; this one stops at its next checkpoint."""


class Progress:
    """What the pipeline reports while it works. Every call publishes a new snapshot."""

    def __init__(self, run_id: str) -> None:
        self._run_id = run_id
        self._started: dict[StageId, float] = {}

    def start_stage(self, stage_id: StageId, total: int, unit: str) -> None:
        self._raise_if_cancelled()
        self._started[stage_id] = time.perf_counter()
        self._update_stage(
            stage_id,
            StageProgress(
                stage_id=stage_id,
                status="running",
                completed=0,
                total=total,
                unit=unit,
                elapsed_ms=0,
            ),
        )

    def advance(self, stage_id: StageId, completed: int) -> None:
        """Set the absolute count of work units done in a running stage."""
        self._raise_if_cancelled()
        stage = self._stage(stage_id)
        self._update_stage(
            stage_id,
            stage.model_copy(
                update={"completed": min(completed, stage.total), "elapsed_ms": self._ms(stage_id)}
            ),
        )

    def finish_stage(self, stage_id: StageId) -> None:
        stage = self._stage(stage_id)
        self._update_stage(
            stage_id,
            stage.model_copy(
                update={
                    "status": "done",
                    "completed": stage.total,
                    "elapsed_ms": self._ms(stage_id),
                }
            ),
        )

    def set_optimal_score(self, score: float) -> None:
        _update(self._run_id, lambda run: run.model_copy(update={"optimal_score": score}))

    def add_checkpoint(self, point: ConvergencePoint) -> None:
        self._raise_if_cancelled()
        _update(
            self._run_id,
            lambda run: run.model_copy(update={"convergence": [*run.convergence, point]}),
        )

    def _raise_if_cancelled(self) -> None:
        with _lock:
            if self._run_id in _cancelled:
                raise RunCancelledError(self._run_id)

    def _ms(self, stage_id: StageId) -> int:
        return round((time.perf_counter() - self._started[stage_id]) * 1000)

    def _stage(self, stage_id: StageId) -> StageProgress:
        with _lock:
            run = _runs[self._run_id][1]
        return run.stages[STAGE_IDS.index(stage_id)]

    def _update_stage(self, stage_id: StageId, stage: StageProgress) -> None:
        index = STAGE_IDS.index(stage_id)

        def replace(run: RotationPlanRun) -> RotationPlanRun:
            stages = [*run.stages]
            stages[index] = stage
            return run.model_copy(update={"stages": stages})

        _update(self._run_id, replace)


def start_rotation_plan(
    owner_id: str, region_id: str, request: RotationPlanRequest
) -> RotationPlanRun:
    """Queue a run for the caller's region. Raises `pipeline.SimulatorDataError` without inputs."""
    pipeline.ensure_inputs()
    run = RotationPlanRun(
        run_id=uuid4().hex,
        status="queued",
        region_id=region_id,
        request=request,
        stages=[
            StageProgress(
                stage_id=stage_id,
                status="pending",
                completed=0,
                total=0,
                unit=pipeline.STAGE_UNITS[stage_id],
                elapsed_ms=None,
            )
            for stage_id in STAGE_IDS
        ],
        agent_seeds=len(pipeline.AGENT_SEEDS),
        optimal_score=None,
        convergence=[],
        error=None,
        result=None,
    )
    with _lock:
        previous = _latest_by_owner.get(owner_id)
        if previous is not None and previous in _runs:
            _cancelled.add(previous)
        _latest_by_owner[owner_id] = run.run_id
        _runs[run.run_id] = (owner_id, run)
        while len(_runs) > MAX_RUNS:
            evicted, _ = _runs.popitem(last=False)
            _cancelled.discard(evicted)
    _executor.submit(_execute, run.run_id, region_id, request)
    return run


def get_rotation_plan(owner_id: str, run_id: str) -> RotationPlanRun:
    with _lock:
        entry = _runs.get(run_id)
    if entry is None or entry[0] != owner_id:
        raise RunNotFoundError(run_id)
    return entry[1]


def get_rotation_plan_setup(region_id: str) -> RotationPlanSetup:
    """Raises `pipeline.SimulatorDataError` without inputs, `RegionNotSimulatedError` if unknown."""
    pipeline.ensure_inputs()
    try:
        return pipeline.describe_setup(region_id)
    except kernel.UnknownFieldError as error:
        raise RegionNotSimulatedError(region_id) from error


def _execute(run_id: str, region_id: str, request: RotationPlanRequest) -> None:
    with _lock:
        if run_id not in _runs:
            return
        cancelled = run_id in _cancelled
    if cancelled:
        _finish(run_id, status="cancelled")
        return
    _update(run_id, lambda run: run.model_copy(update={"status": "running"}))
    try:
        result = pipeline.run(region_id, request, Progress(run_id))
    except RunCancelledError:
        _finish(run_id, status="cancelled")
    except Exception as error:
        logger.exception("Rotation plan run %s failed", run_id)
        _finish(run_id, status="failed", error=str(error) or type(error).__name__)
    else:
        _finish(run_id, status="done", result=result)


def _finish(
    run_id: str,
    *,
    status: RunStatus,
    error: str | None = None,
    result: RotationPlanResult | None = None,
) -> None:
    _update(
        run_id,
        lambda run: run.model_copy(update={"status": status, "error": error, "result": result}),
    )
    with _lock:
        _cancelled.discard(run_id)


def _update(run_id: str, change: Callable[[RotationPlanRun], RotationPlanRun]) -> None:
    with _lock:
        entry = _runs.get(run_id)
        if entry is not None:
            _runs[run_id] = (entry[0], change(entry[1]))
