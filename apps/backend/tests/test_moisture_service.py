from pathlib import Path

import pytest

from app.modules.water.assets import RESOURCES, ArtifactError
from app.modules.water.moisture import moisture_settings, predict_moisture
from app.modules.water.service import read_json_object

requires_moisture = pytest.mark.skipif(
    not (moisture_settings().water_models_dir / "moisture-v1.joblib").is_file(),
    reason="Run water CLI setup and moisture-setup for frozen-inference tests",
)


@requires_moisture
def test_wetness_frozen_inference_matches_export(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PYTHONPATH", "/invalid/path")
    monkeypatch.setenv("PYTHONHOME", "/invalid/home")
    result = predict_moisture(read_json_object(RESOURCES / "moisture-request.example.json"))
    assert result == read_json_object(RESOURCES / "moisture-response.example.json")
    assert result["status"] == "research_only"


@requires_moisture
def test_wetness_rejects_future_features() -> None:
    request = read_json_object(RESOURCES / "moisture-request.example.json")
    features = request["features"]
    assert isinstance(features, dict)
    features["future_rain"] = 20
    with pytest.raises(ArtifactError, match="exactly"):
        predict_moisture(request)


def test_wetness_installation_cannot_overlap_prior_release(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setenv("WATER_MODELS_DIR", str(tmp_path / "models/moisture-v1"))
    monkeypatch.setenv("WATER_DATA_DIR", str(tmp_path / "data/water-v1"))
    with pytest.raises(ArtifactError, match="separate"):
        moisture_settings()
