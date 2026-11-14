"""Install and verify the immutable model runtime before executing any model code."""

import hashlib
import os
import subprocess
import sys
import tarfile
import tempfile
from itertools import combinations
from pathlib import Path, PurePosixPath

from pydantic import BaseModel, Field

from app.core.config import WaterModelSettings

RESOURCES = Path(__file__).with_name("resources")


class ArtifactError(RuntimeError):
    """The model artifact or environment is incomplete or differs from the release."""


class ArtifactFile(BaseModel):
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    size: int = Field(ge=0, le=30_000_000)


class ArtifactManifest(BaseModel):
    repository: str
    tag: str
    asset: str
    archive_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    python_version: str
    files: dict[str, ArtifactFile]


def manifest() -> ArtifactManifest:
    return ArtifactManifest.model_validate_json((RESOURCES / "release.json").read_text())


def clean_environment() -> dict[str, str]:
    return {
        **{
            key: value
            for key, value in os.environ.items()
            if key not in {"PYTHONPATH", "PYTHONHOME"}
        },
        "PYTHONDONTWRITEBYTECODE": "1",
        "PYTHONNOUSERSITE": "1",
    }


def checksum(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def payload_path(name: str, models: Path, data: Path) -> Path:
    parts = PurePosixPath(name).parts
    if (
        len(parts) < 2
        or parts[0] not in {"models", "data"}
        or any(part in {"..", "."} for part in parts)
        or "\\" in name
        or str(PurePosixPath(name)) != name
    ):
        raise ArtifactError(f"Invalid payload path: {name}")
    root = models if parts[0] == "models" else data
    target = root.joinpath(*parts[1:])
    if not target.resolve().is_relative_to(root.resolve()):
        raise ArtifactError(f"Escaping payload path: {name}")
    return target


def verify_payload(release: ArtifactManifest, models: Path, data: Path) -> None:
    for root_name, root in (("models", models), ("data", data)):
        expected = {name for name in release.files if name.startswith(root_name + "/")}
        if not expected:
            continue
        if root.is_symlink() or any(path.is_symlink() for path in root.rglob("*")):
            raise ArtifactError(f"Model payload contains linked paths: {root_name}")
        actual = {
            root_name + "/" + path.relative_to(root).as_posix()
            for path in root.rglob("*")
            if path.is_file()
        }
        if actual - expected:
            raise ArtifactError(f"Unexpected model payload files: {sorted(actual - expected)}")
    for name, record in release.files.items():
        path = payload_path(name, models, data)
        if not path.is_file() or path.is_symlink():
            raise ArtifactError(f"Missing or linked model payload: {name}")
        if path.stat().st_size != record.size or checksum(path) != record.sha256:
            raise ArtifactError(f"Model payload checksum mismatch: {name}")


def install_archive(archive: Path, release: ArtifactManifest, models: Path, data: Path) -> None:
    if checksum(archive) != release.archive_sha256:
        raise ArtifactError("Archive checksum mismatch; nothing was installed")
    for name in release.files:
        payload_path(name, models, data)
    # An existing immutable release is reusable only when every installed byte matches.
    for root_name, root in (("models", models), ("data", data)):
        if root.exists():
            subset = release.model_copy(
                update={
                    "files": {
                        k: v for k, v in release.files.items() if k.startswith(root_name + "/")
                    }
                }
            )
            verify_payload(subset, models, data)
    with tempfile.TemporaryDirectory(prefix="cropilot-models-") as temporary:
        stage = Path(temporary)
        with tarfile.open(archive, "r:gz") as handle:
            members = handle.getmembers()
            names = [member.name for member in members]
            if len(names) != len(set(names)):
                raise ArtifactError("Archive contains duplicate members")
            if set(names) != set(release.files):
                raise ArtifactError("Archive contents differ from the release manifest")
            for member in members:
                record = release.files[member.name]
                if not member.isfile() or member.size != record.size:
                    raise ArtifactError(f"Invalid payload file: {member.name}")
                stream = handle.extractfile(member)
                if stream is None:
                    raise ArtifactError(f"Unreadable payload file: {member.name}")
                content = stream.read(record.size + 1)
                if (
                    len(content) != record.size
                    or hashlib.sha256(content).hexdigest() != record.sha256
                ):
                    raise ArtifactError(f"Payload checksum mismatch: {member.name}")
                path = payload_path(member.name, stage / "models", stage / "data")
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(content)
        # All bytes are checked before installing either tree. Files stay immutable afterward.
        for root_name, root in (("models", models), ("data", data)):
            if not root.exists():
                root.mkdir(parents=True)
                for source in (stage / root_name).rglob("*"):
                    if source.is_file():
                        destination = root / source.relative_to(stage / root_name)
                        destination.parent.mkdir(parents=True, exist_ok=True)
                        destination.write_bytes(source.read_bytes())
    verify_payload(release, models, data)


def run_command(
    arguments: list[str], *, timeout: int = 180, cwd: Path | None = None
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        arguments,
        check=True,
        capture_output=True,
        text=True,
        env=clean_environment(),
        timeout=timeout,
        cwd=cwd,
    )


def validate_storage_paths(settings: WaterModelSettings) -> None:
    paths = (settings.water_models_dir, settings.water_data_dir, settings.water_environment)
    if not all(path.is_absolute() for path in paths):
        raise ArtifactError("Model storage and environment paths must be absolute")
    roots = tuple(path.resolve() for path in paths)
    if any(a.is_relative_to(b) or b.is_relative_to(a) for a, b in combinations(roots, 2)):
        raise ArtifactError(
            "Model storage and environment paths must be separate, non-nested roots"
        )
    application_environments = (Path(__file__).resolve().parents[3] / ".venv", Path(sys.prefix))
    if any(
        root.is_relative_to(environment.resolve()) or environment.resolve().is_relative_to(root)
        for root in roots
        for environment in application_environments
    ):
        raise ArtifactError("Model paths must not overlap the application Python environment")


def verify_python(settings: WaterModelSettings, release: ArtifactManifest) -> RuntimeEnvironment:
    executable = settings.runtime_python
    if not executable.is_file():
        raise ArtifactError("Model Python environment is missing; run the water setup command")
    probe = (
        "import sys, importlib.metadata as m, json; "
        "print(json.dumps({'python': '.'.join(map(str,sys.version_info[:3])), "
        "'packages': {d.metadata['Name'].lower():d.version for d in m.distributions()}}))"
    )
    result = run_command([str(executable), "-c", probe])
    environment = RuntimeEnvironment.model_validate_json(result.stdout)
    if environment.python != release.python_version:
        raise ArtifactError(
            f"Model Python must be {release.python_version}, got {environment.python}"
        )
    return environment


def verify_environment(settings: WaterModelSettings, release: ArtifactManifest) -> None:
    environment = verify_python(settings, release)
    for line in (RESOURCES / "requirements-lock.txt").read_text().splitlines():
        if line.strip() and not line.startswith("#"):
            name, version = line.split("==", 1)
            if environment.packages.get(name.lower()) != version:
                raise ArtifactError(f"Model environment requires {name}=={version}; rerun setup")


class RuntimeEnvironment(BaseModel):
    python: str
    packages: dict[str, str]


def verify_installation() -> None:
    settings = WaterModelSettings()
    validate_storage_paths(settings)
    release = manifest()
    verify_payload(release, settings.water_models_dir, settings.water_data_dir)
    verify_environment(settings, release)


def prepare_models(archive: Path | None = None) -> None:
    settings = WaterModelSettings()
    release = manifest()
    validate_storage_paths(settings)
    if settings.runtime_python.exists():
        verify_python(settings, release)
    with tempfile.TemporaryDirectory(prefix="cropilot-download-") as temporary:
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
    if not settings.runtime_python.exists():
        run_command(
            ["uv", "venv", "--python", release.python_version, str(settings.water_environment)]
        )
    verify_python(settings, release)
    run_command(
        [
            "uv",
            "pip",
            "sync",
            "--python",
            str(settings.runtime_python),
            str(RESOURCES / "requirements-lock.txt"),
        ],
        timeout=300,
    )
    verify_installation()
