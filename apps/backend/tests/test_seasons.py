import json
import statistics
from collections.abc import Callable
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.modules.seasons import service
from app.modules.seasons.schemas import SeasonDashboard, is_mock

Bundle = dict[str, Any]


@pytest.fixture
def bundle() -> Bundle:
    return json.loads(service.MOCK_BUNDLE_PATH.read_text())


def test_mock_bundle_is_valid() -> None:
    dashboard = service.get_dashboard()

    assert dashboard.schema_version == "dashboard-v1"
    assert dashboard.data_status == "partial"


def test_mock_bundle_picks_the_developing_el_nino_seasons() -> None:
    similar = [s.season_id for s in service.get_dashboard().seasons if s.is_similar]

    assert similar == ["1982/83", "1987/88", "1991/92", "1997/98", "2015/16", "2023/24"]


def test_every_synthetic_number_is_sourced_as_mock() -> None:
    dashboard = service.get_dashboard()

    assert all(is_mock(s.margin.source_ids) for s in dashboard.strategies)
    assert all(is_mock(s.carbon_input.source_ids) for s in dashboard.strategies)
    assert is_mock(dashboard.season_start.root_zone_wetness.source_ids)
    assert not is_mock(dashboard.seasons_source_ids)


def test_dry_wet_split_keeps_the_unrounded_median() -> None:
    seasons = service.get_dashboard().seasons
    neutral = [s for s in seasons if s.enso_phase == "neutral"]

    assert sum(s.start_soil == "dry" for s in neutral) == 13
    assert next(s for s in seasons if s.season_id == "2011/12").start_soil == "dry"


def test_mock_margins_do_not_favor_a_strategy() -> None:
    # A screenshot of mock margins must not suggest that one strategy wins.
    dashboard = service.get_dashboard()
    similar = [s.season_id for s in dashboard.seasons if s.is_similar]
    medians = [
        statistics.median(m for i in similar if (m := s.margin.by_season.get(i)) is not None)
        for s in dashboard.strategies
    ]

    assert max(medians) - min(medians) < 80


def test_endpoint_requires_a_session() -> None:
    assert TestClient(app).get("/api/seasons/dashboard").status_code == 401


def _two_current(b: Bundle) -> None:
    b["strategies"][1]["is_current"] = True


def _null_not_missing(b: Bundle) -> None:
    b["season_start"]["oni"]["value"] = None


def _value_but_missing(b: Bundle) -> None:
    b["season_start"]["oni"]["provenance"] = "missing"


def _unknown_season_margin(b: Bundle) -> None:
    b["strategies"][0]["margin"]["by_season"]["1970/71"] = 100


def _unsorted_seasons(b: Bundle) -> None:
    b["seasons"].reverse()


def _bad_season_id(b: Bundle) -> None:
    b["seasons"][0]["season_id"] = "1981/83"


def _real_with_mock(b: Bundle) -> None:
    b["data_status"] = "real"


def _unknown_source(b: Bundle) -> None:
    b["seasons_source_ids"].append("nobody")


def _mixed_margin_mockness(b: Bundle) -> None:
    b["strategies"][0]["margin"]["source_ids"] = ["nasa_power"]


def _wetness_out_of_range(b: Bundle) -> None:
    b["seasons"][0]["root_zone_wetness"] = 1.2


def _non_http_link(b: Bundle) -> None:
    b["sources"][0]["url"] = "javascript:alert(1)"


@pytest.mark.parametrize(
    "corrupt",
    [
        _two_current,
        _null_not_missing,
        _value_but_missing,
        _unknown_season_margin,
        _unsorted_seasons,
        _bad_season_id,
        _real_with_mock,
        _unknown_source,
        _mixed_margin_mockness,
        _wetness_out_of_range,
        _non_http_link,
    ],
)
def test_inconsistent_bundle_is_rejected(bundle: Bundle, corrupt: Callable[[Bundle], None]) -> None:
    corrupt(bundle)

    with pytest.raises(ValidationError):
        SeasonDashboard.model_validate(bundle)
