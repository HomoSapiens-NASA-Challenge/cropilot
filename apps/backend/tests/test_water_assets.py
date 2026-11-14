import hashlib
import io
import tarfile
from pathlib import Path

import pytest

from app.modules.water.assets import (
    ArtifactError,
    ArtifactManifest,
    install_archive,
    verify_payload,
)


def fixture_archive(tmp_path: Path, names: list[str]) -> tuple[Path, ArtifactManifest]:
    archive = tmp_path / "synthetic.tar.gz"
    content = b"synthetic fixture, never a model"
    with tarfile.open(archive, "w:gz") as handle:
        for name in names:
            member = tarfile.TarInfo(name)
            member.size = len(content)
            handle.addfile(member, io.BytesIO(content))
    manifest = ArtifactManifest.model_validate(
        {
            "repository": "example/synthetic",
            "tag": "synthetic",
            "asset": archive.name,
            "archive_sha256": hashlib.sha256(archive.read_bytes()).hexdigest(),
            "python_version": "3.12.7",
            "files": {
                name: {"sha256": hashlib.sha256(content).hexdigest(), "size": len(content)}
                for name in names
            },
        }
    )
    return archive, manifest


def test_bad_archive_cannot_install_or_replace_existing_payload(tmp_path: Path) -> None:
    archive, manifest = fixture_archive(tmp_path, ["models/model.txt", "data/input.txt"])
    destination = tmp_path / "install"
    install_archive(archive, manifest, destination / "models", destination / "data")
    before = (destination / "models/model.txt").read_bytes()
    archive.write_bytes(b"corrupted")
    with pytest.raises(ArtifactError, match="checksum"):
        install_archive(archive, manifest, destination / "models", destination / "data")
    assert (destination / "models/model.txt").read_bytes() == before


@pytest.mark.parametrize("name", ["models/../../escape", "/tmp/escape", "unexpected/file"])
def test_unsafe_payload_path_is_rejected(tmp_path: Path, name: str) -> None:
    archive, manifest = fixture_archive(tmp_path, [name])
    with pytest.raises(ArtifactError, match="path"):
        install_archive(archive, manifest, tmp_path / "models", tmp_path / "data")
    assert not (tmp_path / "models").exists()


def test_duplicate_archive_members_are_rejected(tmp_path: Path) -> None:
    archive, manifest = fixture_archive(tmp_path, ["models/model.txt", "models/model.txt"])
    with pytest.raises(ArtifactError, match="duplicate"):
        install_archive(archive, manifest, tmp_path / "models", tmp_path / "data")


def test_modified_installed_file_blocks_verification_and_reinstall(tmp_path: Path) -> None:
    archive, manifest = fixture_archive(tmp_path, ["models/model.txt", "data/input.txt"])
    install_archive(archive, manifest, tmp_path / "models", tmp_path / "data")
    verify_payload(manifest, tmp_path / "models", tmp_path / "data")
    (tmp_path / "models/model.txt").write_text("modified")
    with pytest.raises(ArtifactError, match="checksum"):
        verify_payload(manifest, tmp_path / "models", tmp_path / "data")
    with pytest.raises(ArtifactError, match="checksum"):
        install_archive(archive, manifest, tmp_path / "models", tmp_path / "data")


def test_unlisted_installed_python_file_blocks_execution(tmp_path: Path) -> None:
    archive, manifest = fixture_archive(tmp_path, ["models/model.txt", "data/input.txt"])
    install_archive(archive, manifest, tmp_path / "models", tmp_path / "data")
    (tmp_path / "models/sitecustomize.py").write_text("raise RuntimeError('unexpected')")
    with pytest.raises(ArtifactError, match="Unexpected"):
        verify_payload(manifest, tmp_path / "models", tmp_path / "data")


def test_linked_payload_directory_is_rejected(tmp_path: Path) -> None:
    archive, manifest = fixture_archive(tmp_path, ["models/runtime/model.txt", "data/input.txt"])
    install_archive(archive, manifest, tmp_path / "models", tmp_path / "data")
    (tmp_path / "models/runtime").rename(tmp_path / "models/copied")
    (tmp_path / "models/runtime").symlink_to(tmp_path / "models/copied", target_is_directory=True)
    with pytest.raises(ArtifactError, match="linked"):
        verify_payload(manifest, tmp_path / "models", tmp_path / "data")


def test_application_python_is_rejected_for_model_inference() -> None:
    import sys

    from app.core.config import WaterModelSettings
    from app.modules.water.assets import manifest, verify_environment

    settings = WaterModelSettings(water_environment=Path(sys.executable).parent.parent)
    with pytest.raises(ArtifactError, match=r"Model Python must be 3\.12\.7"):
        verify_environment(settings, manifest())
