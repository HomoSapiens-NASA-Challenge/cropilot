import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.auth import User, get_current_user
from app.main import create_app

CURVE = [0.2, 0.25, 0.4, 0.6, 0.8, 0.85, 0.7, 0.4, 0.3]


def synthetic_field_map(zone: str = "pergamino", purity: float = 0.9) -> dict:
    record = {
        "campaign": "24/25",
        "source": "INTA",
        "crop_code": 1,
        "crop": "Soybean",
        "purity": purity,
        "curve": CURVE,
        "phase_code": "neutral",
        "phase": "Neutral",
        "oni": -0.43,
        "vigor": 0.85,
        "zone_vigor": 0.87,
        "gap": -0.023,
        "lag": 0,
        "even": 0.92,
        "zone_curve": CURVE,
    }
    field = {
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[-60.6, -33.9], [-60.59, -33.9], [-60.59, -33.89], [-60.6, -33.9]]],
        },
        "properties": {
            "id": "L01",
            "name": "Field 1",
            "own": True,
            "farm": "Synthetic farm",
            "ha": 42.5,
            "status_code": "ok",
            "status": "Good",
            "reason": "Vigor 2% below the zone's soybean fields.",
            "crop": "Soybean",
            "confidence": None,
            "history": [record],
        },
    }
    meta = {
        "zone": zone,
        "lang": "en",
        "campaigns": ["24/25"],
        "latest": "24/25",
        "farm": "Synthetic farm",
        "farm_is_synthetic": True,
        "enso": {"24/25": {"phase_code": "neutral", "phase": "Neutral", "oni": -0.43}},
        "current": {
            "campaign": "26/27",
            "phase_code": "nino",
            "phase": "El Niño",
            "strength": "strong",
            "oni": 2.16,
        },
        "sources": ["synthetic test data"],
    }
    # A neighbour field whose crop the zone has too few of to compare: every comparison is null.
    neighbour_record = {
        **record,
        "crop_code": None,
        "crop": "No data",
        "vigor": 0.31,
        "zone_vigor": None,
        "gap": None,
        "lag": None,
        "even": None,
        "zone_curve": None,
    }
    neighbour = {
        "type": "Feature",
        "geometry": field["geometry"],
        "properties": {
            "id": "N0001",
            "name": "Neighbour field 1",
            "own": False,
            "ha": 12.0,
            "status_code": "bare",
            "status": "No crop",
            "reason": "The satellite sees almost no vegetation in summer: fallow or not sown.",
            "crop": "No data",
            "confidence": 0.71,
            "history": [neighbour_record],
        },
    }
    return {"type": "FeatureCollection", "meta": meta, "features": [field, neighbour]}


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setenv("CROP_MAP_DIR", str(tmp_path))
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: User(id="test")
    return TestClient(app)


def write(directory: Path, zone: str, content: dict) -> None:
    (directory / f"lots_{zone}_en.geojson").write_text(json.dumps(content), encoding="utf-8")


def test_field_map_requires_authentication() -> None:
    assert TestClient(create_app()).get("/api/crops/zones/pergamino/fields").status_code == 401


def test_serves_released_field_map(client: TestClient, tmp_path: Path) -> None:
    write(tmp_path, "pergamino", synthetic_field_map())
    response = client.get("/api/crops/zones/pergamino/fields")
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["current"]["phase_code"] == "nino"
    assert body["features"][0]["properties"]["history"][0]["gap"] == -0.023
    assert body["features"][1]["properties"]["history"][0]["zone_vigor"] is None
    assert body["features"][1]["properties"]["farm"] is None


def test_unknown_zone_is_not_a_filesystem_path(client: TestClient) -> None:
    assert client.get("/api/crops/zones/..%2Fsecrets/fields").status_code in (404, 422)
    assert client.get("/api/crops/zones/cordoba/fields").status_code == 422


def test_missing_release_fails_without_disclosing_paths(
    client: TestClient, tmp_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    response = client.get("/api/crops/zones/parana/fields")
    assert response.status_code == 503
    assert str(tmp_path) not in response.text
    assert "Crop map for parana unavailable" in caplog.text


@pytest.mark.parametrize(
    "content",
    [synthetic_field_map(zone="parana"), synthetic_field_map(purity=1.5)],
    ids=["file-of-another-zone", "purity-above-one"],
)
def test_rejects_files_that_break_the_contract(
    client: TestClient, tmp_path: Path, content: dict
) -> None:
    write(tmp_path, "pergamino", content)
    assert client.get("/api/crops/zones/pergamino/fields").status_code == 503
