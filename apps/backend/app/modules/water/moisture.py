"""Verified installation and synchronous inference for the regional wetness experiment."""

import json
import tempfile
from pathlib import Path

from pydantic import JsonValue

from app.core.config import WaterModelSettings
from app.modules.water.assets import (
    RESOURCES,
    ArtifactError,
    ArtifactManifest,
    install_archive,
    run_command,
    validate_storage_paths,
    verify_installation,
    verify_payload,
)
from app.modules.water.service import JSON_OBJECT, execute_model


def moisture_settings() -> WaterModelSettings:
    water = WaterModelSettings()
    selected = water.model_copy(
        update={
            "water_models_dir": water.water_models_dir.parent / "moisture-v1",
            "water_data_dir": water.water_data_dir.parent / "moisture-v1",
        }
    )
    validate_storage_paths(selected)
    for new in (selected.water_models_dir, selected.water_data_dir):
        for existing in (water.water_models_dir, water.water_data_dir):
            if new.resolve().is_relative_to(
                existing.resolve()
            ) or existing.resolve().is_relative_to(new.resolve()):
                raise ArtifactError("Moisture storage must be separate from frozen water storage")
    return selected


def moisture_manifest() -> ArtifactManifest:
    return ArtifactManifest.model_validate_json((RESOURCES / "moisture-release.json").read_text())


def verify_moisture() -> None:
    verify_installation()
    settings = moisture_settings()
    verify_payload(moisture_manifest(), settings.water_models_dir, settings.water_data_dir)


def prepare_moisture(archive: Path | None = None) -> None:
    """Install the additional model release into separate immutable directories."""
    verify_installation()
    settings, release = moisture_settings(), moisture_manifest()
    with tempfile.TemporaryDirectory(prefix="cropilot-moisture-download-") as temporary:
        if archive is None:
            run_command(
                [
                    "gh",
                    "release",
                    "download",
                    release.tag,
                    "--repo",
                    release.repository,
                    "--pattern",
                    release.asset,
                    "--dir",
                    temporary,
                ]
            )
            archive = Path(temporary) / release.asset
        install_archive(archive, release, settings.water_models_dir, settings.water_data_dir)
    verify_moisture()


def predict_moisture(request: dict[str, JsonValue]) -> dict[str, JsonValue]:
    """Return 7/14-day historical estimates relative to the last input date."""
    verify_moisture()
    settings = moisture_settings()
    with tempfile.TemporaryDirectory(prefix="cropilot-moisture-request-") as temporary:
        request_path = Path(temporary) / "request.json"
        request_path.write_text(json.dumps(request, allow_nan=False), encoding="utf-8")
        result = execute_model(
            [
                str(settings.runtime_python),
                str(settings.water_models_dir / "runtime/moisture.py"),
                "predict",
                str(settings.water_models_dir / "moisture-v1.joblib"),
                str(request_path),
            ],
            settings.water_models_dir,
        )
    return JSON_OBJECT.validate_json(result)
