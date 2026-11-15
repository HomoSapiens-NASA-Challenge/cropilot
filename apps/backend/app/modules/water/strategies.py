"""Install and serve precomputed historical cases; HTTP never runs a simulation."""

import gzip
import re
import tempfile
from pathlib import Path

from app.core.config import WaterModelSettings
from app.modules.water.assets import (
    RESOURCES,
    ArtifactError,
    ArtifactManifest,
    checksum,
    install_archive,
    payload_path,
    run_command,
    validate_storage_paths,
    verify_installation,
    verify_payload,
)
from app.modules.water.schemas import StrategiesBundle, WaterRunDetail


def build_strategies(output: Path, source_archive: Path | None = None) -> None:
    """Reproduce all four analyses from the frozen source snapshot and engine."""
    verify_installation()
    settings = WaterModelSettings()
    output = output.resolve()
    for root in (settings.water_models_dir, settings.water_data_dir, settings.water_environment):
        if output.is_relative_to(root.resolve()) or root.resolve().is_relative_to(output):
            raise ValueError("Build output must be outside immutable runtime and source roots")
    with tempfile.TemporaryDirectory(prefix="pergamino-source-") as temporary:
        if source_archive is None:
            run_command(
                [
                    "gh",
                    "release",
                    "download",
                    "pergamino-diagnostics-2026-11-14",
                    "--repo",
                    "HomoSapiens-NASA-Challenge/hub",
                    "--pattern",
                    "pergamino-tables-and-field.zip",
                    "--dir",
                    temporary,
                ]
            )
            source_archive = Path(temporary) / "pergamino-tables-and-field.zip"
        run_command(
            [
                str(settings.runtime_python),
                str(Path(__file__).resolve().parents[3] / "experiments/strategies.py"),
                "--config",
                str(RESOURCES / "strategies-config.json"),
                "--archive",
                str(source_archive.resolve()),
                "--runtime",
                str(settings.water_models_dir / "runtime/simulator"),
                "--output",
                str(output),
            ],
            timeout=600,
        )


def strategies_settings() -> WaterModelSettings:
    base = WaterModelSettings()
    settings = base.model_copy(
        update={
            "water_models_dir": base.water_models_dir.parent / "strategies-v1",
            "water_data_dir": base.water_data_dir.parent / "strategies-v1",
        }
    )
    validate_storage_paths(settings)
    for target in (settings.water_models_dir, settings.water_data_dir):
        for old in (base.water_models_dir, base.water_data_dir):
            if target.resolve().is_relative_to(old.resolve()) or old.resolve().is_relative_to(
                target.resolve()
            ):
                raise ArtifactError("Strategies storage overlaps frozen water inputs")
    return settings


def strategies_manifest() -> ArtifactManifest:
    return ArtifactManifest.model_validate_json((RESOURCES / "strategies-release.json").read_text())


def prepare_strategies(archive: Path | None = None) -> None:
    """Install checked results without requiring the scientific Python environment."""
    settings, release = strategies_settings(), strategies_manifest()
    with tempfile.TemporaryDirectory(prefix="cropilot-strategies-") as temporary:
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
    verify_strategies()


def verify_strategies() -> None:
    settings = strategies_settings()
    verify_payload(strategies_manifest(), settings.water_models_dir, settings.water_data_dir)
    load_strategies()


def read_verified(name: str) -> bytes:
    settings, release = strategies_settings(), strategies_manifest()
    record = release.files.get(name)
    if record is None:
        raise ArtifactError("File is not in the frozen strategies release")
    path = payload_path(name, settings.water_models_dir, settings.water_data_dir)
    if path.is_symlink() or any(p.is_symlink() for p in path.parents) or not path.is_file():
        raise ArtifactError("Strategies data missing or linked; run strategies-setup")
    if path.stat().st_size != record.size or checksum(path) != record.sha256:
        raise ArtifactError("Strategies data checksum mismatch")
    return path.read_bytes()


def load_strategies() -> StrategiesBundle:
    return StrategiesBundle.model_validate_json(read_verified("data/strategies.json"))


def load_strategy_run(run_id: str) -> WaterRunDetail:
    if not re.fullmatch(r"[a-f0-9]{20}", run_id):
        raise KeyError("Unknown historical run")
    bundle = load_strategies()
    if run_id not in {r.run_id for r in bundle.runs}:
        raise KeyError("Unknown historical run")
    raw = read_verified(f"data/daily/{run_id}.json.gz")
    detail = WaterRunDetail.model_validate_json(gzip.decompress(raw))
    if detail.run_id != run_id:
        raise ArtifactError("Daily file does not match requested run")
    return detail
