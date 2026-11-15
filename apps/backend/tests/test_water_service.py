import json
from pathlib import Path

import pytest

from app.core.config import WaterModelSettings
from app.modules.water.assets import RESOURCES, ArtifactError
from app.modules.water.service import compare_water_scenarios, predict_regional, read_json_object

runtime_available = WaterModelSettings().runtime_python.is_file()
requires_runtime = pytest.mark.skipif(
    not runtime_available,
    reason="Run python -m app.modules.water.cli setup for frozen-runtime tests",
)


@requires_runtime
def test_frozen_regional_prediction_matches_export_and_ignores_foreign_python(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PYTHONPATH", "/invalid/python/path")
    monkeypatch.setenv("PYTHONHOME", "/invalid/python/home")
    expected = json.loads((RESOURCES / "response.example.json").read_text())
    result = predict_regional(read_json_object(RESOURCES / "request.example.json"))
    assert result == expected


@requires_runtime
def test_regional_rejects_invalid_request() -> None:
    with pytest.raises(ArtifactError, match="failed"):
        predict_regional({"schema_version": "invalid"})


@requires_runtime
def test_water_exports_36_runs_without_overwriting_prior_output(tmp_path: Path) -> None:
    first = compare_water_scenarios(output_parent=tmp_path)
    second = compare_water_scenarios(output_parent=tmp_path)
    assert first.output_directory != second.output_directory
    runs, model = first.manifest["runs"], first.manifest["model"]
    assert isinstance(runs, list)
    assert len(runs) == 36
    assert isinstance(model, dict)
    assert model["validation_status"] == "not_validated"
    assert (first.output_directory / "comparison.json").is_file()
    assert (second.output_directory / "comparison.json").is_file()


def test_json_input_must_be_object(tmp_path: Path) -> None:
    path = tmp_path / "request.json"
    path.write_text("[]")
    with pytest.raises(ValueError, match="object"):
        read_json_object(path)
