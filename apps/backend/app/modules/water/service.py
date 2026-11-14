"""Synchronous model services. Call from a worker or a synchronous API handler."""

import json
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

from pydantic import JsonValue, TypeAdapter

from app.core.config import WaterModelSettings
from app.modules.water.assets import RESOURCES, ArtifactError, run_command, verify_installation

JSON_OBJECT = TypeAdapter(dict[str, JsonValue])


def read_json_object(path: Path) -> dict[str, JsonValue]:
    value = TypeAdapter(JsonValue).validate_json(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("Model JSON input must be an object")
    return value


def execute_model(arguments: list[str], cwd: Path) -> str:
    try:
        return run_command(arguments, cwd=cwd).stdout
    except subprocess.CalledProcessError as error:
        raise ArtifactError(f"Model execution failed: {error.stderr.strip()}") from error
    except subprocess.TimeoutExpired as error:
        raise ArtifactError("Model execution exceeded the 180-second time limit") from error


def predict_regional(request: dict[str, JsonValue]) -> dict[str, JsonValue]:
    """Return the frozen regional experiment's research-only JSON response."""
    verify_installation()
    settings = WaterModelSettings()
    runtime = settings.water_models_dir / "runtime/research/ml-investigacion/enso-lab"
    with tempfile.TemporaryDirectory(prefix="cropilot-request-") as temporary:
        request_path = Path(temporary) / "request.json"
        request_path.write_text(json.dumps(request, allow_nan=False), encoding="utf-8")
        result = execute_model(
            [
                str(settings.runtime_python),
                "-m",
                "enso_water.inference",
                str(settings.water_models_dir / "enso-water-v1.joblib"),
                str(request_path),
            ],
            runtime,
        )
    return JSON_OBJECT.validate_json(result)


@dataclass(frozen=True)
class WaterComparison:
    manifest: dict[str, JsonValue]
    output_directory: Path


def compare_water_scenarios(
    config: dict[str, JsonValue] | None = None, *, output_parent: Path | None = None
) -> WaterComparison:
    """Compare rotations at the bundled illustrative Río Cuarto point using frozen inputs."""
    verify_installation()
    settings = WaterModelSettings()
    selected = (
        config if config is not None else read_json_object(RESOURCES / "water-config.example.json")
    )
    reference = read_json_object(RESOURCES / "water-config.example.json")
    case, reference_case = selected.get("case"), reference["case"]
    if not isinstance(case, dict) or not isinstance(reference_case, dict):
        raise ValueError("A case object is required")
    for key in ("longitude", "latitude"):
        if case.get(key) != reference_case[key]:
            raise ValueError("This release only contains weather and soil for the Río Cuarto point")
    parent = output_parent or settings.water_data_dir.parent / "water-runs"
    parent = parent.resolve()
    if any(
        parent.is_relative_to(root.resolve())
        for root in (settings.water_models_dir, settings.water_data_dir, settings.water_environment)
    ):
        raise ValueError("Output must be outside the immutable model, data and environment roots")
    parent.mkdir(parents=True, exist_ok=True)
    output = Path(tempfile.mkdtemp(prefix="comparison-", dir=parent))
    with tempfile.TemporaryDirectory(prefix="cropilot-water-input-") as temporary:
        inputs = Path(temporary)
        request_path = inputs / "config.json"
        request_path.write_text(json.dumps(selected, allow_nan=False), encoding="utf-8")
        # The upstream CLI owns its cache. Copy it so a run cannot modify frozen source bytes.
        cache = inputs / "cache"
        shutil.copytree(settings.water_data_dir / "water_cache", cache)
        execute_model(
            [
                str(settings.runtime_python),
                "-m",
                "field_water",
                "run",
                "--config",
                str(request_path),
                "--cache",
                str(cache),
                "--power-file",
                str(cache / "nasa_power.json"),
                "--output",
                str(output),
            ],
            settings.water_models_dir / "runtime/simulator",
        )
    return WaterComparison(read_json_object(output / "comparison.json"), output)
