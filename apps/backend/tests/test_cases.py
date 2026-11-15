import json
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.modules.cases import service
from app.modules.cases.schemas import CaseBundle, CaseIndex
from app.modules.regions.catalog import REGIONS

CURRENT_STRATEGY = "maize-soy-soy"
DECISION_YEAR = 2026
PHASE_THRESHOLDS = (
    ("strong_el_nino", lambda oni: oni >= 1.5),
    ("el_nino", lambda oni: 0.5 <= oni < 1.5),
    ("la_nina", lambda oni: oni <= -0.5),
    ("neutral", lambda oni: -0.5 < oni < 0.5),
)


def committed_bundles() -> dict[str, CaseBundle]:
    """Every committed zone bundle, read straight from disk (not through the cached service)."""
    bundles = {}
    for path in sorted(service.RESOURCES.glob("*.json")):
        if path.name != "index.json":
            bundles[path.stem] = CaseBundle.model_validate_json(path.read_bytes())
    return bundles


@pytest.fixture(autouse=True)
def clear_caches() -> Iterator[None]:
    service._load_index.cache_clear()
    service._load_bundle.cache_clear()
    yield
    service._load_index.cache_clear()
    service._load_bundle.cache_clear()


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())


def test_case_endpoints_are_public(client: TestClient) -> None:
    index = client.get("/api/cases")
    assert index.status_code == 200
    CaseIndex.model_validate(index.json())

    bundle = client.get("/api/cases/pergamino")
    assert bundle.status_code == 200
    assert CaseBundle.model_validate(bundle.json()).zone_id == "pergamino"


def test_unknown_zone_is_not_found(client: TestClient) -> None:
    assert client.get("/api/cases/cordoba").status_code == 404
    assert client.get("/api/cases/..%2Findex").status_code == 404


def test_catalog_zone_without_a_bundle_is_not_found(
    client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(service, "RESOURCES", tmp_path)
    assert client.get("/api/cases/pergamino").status_code == 404


def test_invalid_bundle_fails_without_disclosing_paths(
    client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    (tmp_path / "pergamino.json").write_text(json.dumps({"schema_version": "case-v0"}))
    monkeypatch.setattr(service, "RESOURCES", tmp_path)
    response = client.get("/api/cases/pergamino")
    assert response.status_code == 503
    assert str(tmp_path) not in response.text


def test_every_committed_bundle_validates_and_every_index_zone_has_one() -> None:
    bundles = committed_bundles()
    index = CaseIndex.model_validate_json((service.RESOURCES / "index.json").read_bytes())
    assert {zone.zone_id for zone in index.zones} == set(bundles)
    catalog = {region.id for region in REGIONS}
    assert set(bundles) <= catalog
    for zone in index.zones:
        bundle = bundles[zone.zone_id]
        assert bundle.zone_id == zone.zone_id
        assert zone.modules == bundle.modules
        assert zone.analogs == [
            point.campaign
            for point in sorted(
                (p for p in bundle.years_like_this.campaigns if p.is_analog),
                key=lambda p: p.analog_rank or 0,
            )
        ]


def test_each_bundle_has_exactly_one_current_strategy() -> None:
    for zone_id, bundle in committed_bundles().items():
        current = [s.strategy_id for s in bundle.compare.strategies if s.is_current]
        assert current == [CURRENT_STRATEGY], zone_id


def test_no_analog_campaign_starts_in_or_after_the_decision_year() -> None:
    for zone_id, bundle in committed_bundles().items():
        campaigns = bundle.years_like_this.campaigns
        assert max(point.start_year for point in campaigns) < DECISION_YEAR, zone_id
        analogs = [point for point in campaigns if point.is_analog]
        assert len(analogs) == bundle.years_like_this.method.k, zone_id
        ranks = [p.analog_rank for p in analogs]
        assert None not in ranks, zone_id
        assert sorted(rank for rank in ranks if rank is not None) == list(
            range(1, len(analogs) + 1)
        )
        assert {m.campaign for m in bundle.compare.analog_margins} == {p.campaign for p in analogs}


def test_enso_phase_follows_the_jul_sep_value() -> None:
    for zone_id, bundle in committed_bundles().items():
        for point in bundle.years_like_this.campaigns:
            expected = next(name for name, rule in PHASE_THRESHOLDS if rule(point.oni_jas))
            assert point.enso_phase == expected, (zone_id, point.campaign)


def test_module_flags_match_the_blocks_that_are_present() -> None:
    for zone_id, bundle in committed_bundles().items():
        assert (bundle.compare.water is not None) == (bundle.modules.water == "available"), zone_id
        assert (bundle.field is not None) == (bundle.modules.field == "available"), zone_id


def test_water_episodes_join_only_analog_campaigns() -> None:
    bundle = committed_bundles()["pergamino"]
    assert bundle.compare.water is not None
    campaigns = bundle.years_like_this.campaigns
    analog_ids = {point.scenario_id for point in campaigns if point.is_analog}
    for episode in bundle.compare.water.episodes:
        if episode.scenario_id is None:
            assert episode.crops == []
        else:
            assert episode.scenario_id in analog_ids
            assert episode.crops
            year = episode.start_year
            assert episode.scenario_id == f"analog:{year}/{(year + 1) % 100:02d}"
