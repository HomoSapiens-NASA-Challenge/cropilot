import hashlib
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.auth import User, get_current_user
from app.core.config import WaterModelSettings
from app.main import create_app
from app.modules.water import service, strategies
from app.modules.water.assets import ArtifactError, ArtifactManifest


def test_water_scenarios_require_authentication() -> None:
    client = TestClient(create_app())
    assert client.get("/api/water/strategies").status_code == 401
    assert client.get("/api/water/strategies/runs/" + "0" * 20).status_code == 401


def test_missing_assets_fail_without_disclosing_server_paths(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def unavailable() -> None:
        raise ArtifactError("private/path/to/data")

    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: User(id="test")
    monkeypatch.setattr(service, "get_water_strategies", unavailable)
    response = TestClient(app).get("/api/water/strategies")
    assert response.status_code == 503
    assert "private/path" not in response.text


def test_invalid_run_is_not_a_filesystem_path() -> None:
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: User(id="test")
    assert TestClient(app).get("/api/water/strategies/runs/not-a-run").status_code == 404


def test_read_checks_content_and_rejects_unregistered_paths(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    content = b'{"synthetic_test":true}'
    settings = WaterModelSettings(
        water_models_dir=tmp_path / "models", water_data_dir=tmp_path / "data"
    )
    settings.water_data_dir.mkdir()
    path = settings.water_data_dir / "strategies.json"
    path.write_bytes(content)
    release = ArtifactManifest(
        repository="synthetic/test",
        tag="synthetic",
        asset="test.tar.gz",
        archive_sha256="0" * 64,
        python_version="3.12.7",
        files={
            "data/strategies.json": {
                "sha256": hashlib.sha256(content).hexdigest(),
                "size": len(content),
            }
        },
    )
    monkeypatch.setattr(strategies, "strategies_settings", lambda: settings)
    monkeypatch.setattr(strategies, "strategies_manifest", lambda: release)
    assert strategies.read_verified("data/strategies.json") == content
    with pytest.raises(ArtifactError, match="not in"):
        strategies.read_verified("data/../secret")
    path.write_bytes(content.replace(b"true", b"null"))
    with pytest.raises(ArtifactError, match="checksum"):
        strategies.read_verified("data/strategies.json")


def test_installed_release_serves_real_run_and_preserves_continuity() -> None:
    if not (strategies.strategies_settings().water_data_dir / "strategies.json").is_file():
        pytest.skip("Run strategies-setup for frozen-output integration")
    bundle = strategies.load_strategies()
    assert len(bundle.runs) == 1170
    assert len(bundle.robustness) == 18
    assert len(bundle.calendar_effects) == 12
    assert bundle.field["field_id"] == "268949"
    assert not bundle.rejected_cases
    run = next(
        r
        for r in bundle.runs
        if r.strategy_id == "winter-wheat" and r.start_year == 2022 and r.summer_shift_days == 14
    )
    detail = strategies.load_strategy_run(run.run_id)
    assert len(detail.crops) == 4
    assert sum(s.crop_et_deficit_mm for c in detail.crops for s in c.stages) == pytest.approx(
        detail.summary.crop_et_deficit_mm
    )
    for earlier, later in zip(detail.rows, detail.rows[1:], strict=False):
        assert later.available_water_start_mm == earlier.available_water_end_mm
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: User(id="test")
    response = TestClient(app).get(f"/api/water/strategies/runs/{run.run_id}")
    assert response.status_code == 200
    assert response.json()["provenance"] == "modeled"
