"""Checks where a wrong number or label would mislead an agronomist reading the demo case.

Run with the backend environment from `apps/backend`:
    uv run pytest -c pyproject.toml ../../scripts/demo_case/test_build.py
Every fixture below is SYNTHETIC: small inline data that mimics the shape of the real inputs.
"""

import json
from pathlib import Path
from typing import Any

import fieldblock
import market
import pytest
import unharvested
import water
from common import BUNDLE_STRATEGY, MARKET_ROTATION, STRATEGY_IDS

from app.modules.cases.schemas import Lot, ReferenceField
from app.modules.crops.schemas import CropField
from app.modules.water.schemas import CropResult, WaterRunSummary

# Synthetic market run -------------------------------------------------------------------------

ROTATIONS = [
    "soja continua",
    "maiz-soja",
    "trigo/soja2-maiz",
    "trigo/soja2-maiz-soja",
    "maiz-soja-soja",
    "cobertura/soja",
]


def synthetic_run(margins: dict[str, dict[str, float]]) -> dict[str, Any]:
    """A run with two analog campaigns; `margins[campaign][rotation]` is the gross margin."""
    analog_years = []
    for rank, (campaign, by_rotation) in enumerate(margins.items(), start=1):
        analog_years.append(
            {
                "rank": rank,
                "scenario_id": f"analog:{campaign}",
                "campaign": campaign,
                "gross_margin_usd_ha": by_rotation,
                "gross_margin_after_rent_usd_ha": {r: v - 100 for r, v in by_rotation.items()},
            }
        )
    leaders = [
        {
            "metric_id": "gross_margin_usd_ha",
            "scenario_id": f"analog:{campaign}",
            "campaign": campaign,
            "leading_strategy": max(by_rotation, key=by_rotation.get),
        }
        for campaign, by_rotation in margins.items()
    ]
    return {
        "analog_years": analog_years,
        "comparison": {"leader_by_campaign": leaders, "ranking_changes": []},
    }


def rotation_margins() -> dict[str, float]:
    return {
        "soja continua": 600.0,
        "maiz-soja": 500.0,
        "trigo/soja2-maiz": 400.0,
        "trigo/soja2-maiz-soja": 450.0,
        "maiz-soja-soja": 520.0,
        "cobertura/soja": 520.0,
    }


def test_strategy_crosswalk_is_a_bijection_over_the_five_bundle_strategies() -> None:
    assert set(MARKET_ROTATION) == set(STRATEGY_IDS)
    assert len(set(MARKET_ROTATION.values())) == len(STRATEGY_IDS)
    assert {BUNDLE_STRATEGY[rotation] for rotation in MARKET_ROTATION.values()} == set(STRATEGY_IDS)
    assert set(water.WATER_TO_BUNDLE.values()) <= set(STRATEGY_IDS)
    # The reference water strategy is the current rotation: maize / soybean / soybean.
    assert water.WATER_TO_BUNDLE[water.REFERENCE_STRATEGY] == "maize-soy-soy"


def test_two_year_wheat_rotation_never_becomes_a_bundle_leader() -> None:
    # trigo/soja2-maiz is ranked by the market model but is not a bundle strategy.
    run = synthetic_run({"1997/98": rotation_margins() | {"trigo/soja2-maiz": 900.0}})
    [row] = market.analog_margins(run)
    assert row.leading_strategy_id == "continuous-soy"
    assert {m.strategy_id for m in row.margins} == set(STRATEGY_IDS)


def test_leader_is_the_highest_gross_margin_among_bundle_strategies() -> None:
    run = synthetic_run({"1997/98": rotation_margins() | {"maiz-soja": 700.0}})
    [row] = market.analog_margins(run)
    assert row.leading_strategy_id == "maize-soy"


def test_ranking_changes_use_campaign_labels_and_display_order() -> None:
    run = synthetic_run({"1997/98": rotation_margins()})
    run["comparison"]["ranking_changes"] = [
        {  # written by the market model with the later strategy first
            "metric_id": "gross_margin_usd_ha",
            "strategy_a": "maiz-soja",
            "strategy_b": "maiz-soja-soja",
            "a_ahead_in": ["analog:1997/98"],
            "b_ahead_in": ["analog:2004/05"],
            "order_inverts": True,
        },
        {  # a pair with the two-year rotation is not a bundle pair
            "metric_id": "gross_margin_usd_ha",
            "strategy_a": "soja continua",
            "strategy_b": "trigo/soja2-maiz",
            "a_ahead_in": ["analog:1997/98"],
            "b_ahead_in": [],
            "order_inverts": False,
        },
    ]
    [change] = market.ranking_changes(run)
    assert (change.strategy_a, change.strategy_b) == ("maize-soy-soy", "maize-soy")
    assert change.a_ahead_in == ["2004/05"]
    assert change.b_ahead_in == ["1997/98"]
    assert change.metric == "gross_margin"
    assert change.order_inverts


# Phases come from ONI Jul-Sep ---------------------------------------------------------------


def synthetic_campaign_row(start_year: int, oni_jas: float, phase_jas: str) -> dict[str, Any]:
    label = f"{start_year}/{(start_year + 1) % 100:02d}"
    return {
        "campaign": label,
        "start_year": start_year,
        "scenario_id": f"analog:{label}",
        "oni_jas": oni_jas,
        "enso_phase_jas": phase_jas,
        "enso_phase_peak": "strong El Niño",  # hindsight value that must never reach the bundle
        "gwetroot_end_aug": 0.6,
        "is_analog": False,
        "analog_rank": None,
        "analog_distance": 2.0,
        "maize_yield_anomaly_pct": -5.0,
        "maize_yield_provenance": "observed",
        "soybean_yield_anomaly_pct": None,
        "soybean_yield_provenance": "missing",
    }


def test_phase_labels_map_to_contract_ids_and_unknown_stops_the_build() -> None:
    assert market.phase_id("strong El Niño") == "strong_el_nino"
    assert market.phase_id("El Niño") == "el_nino"
    assert market.phase_id("neutral") == "neutral"
    assert market.phase_id("La Niña") == "la_nina"
    with pytest.raises(KeyError):
        market.phase_id("El Nino")


def test_campaign_phase_is_the_jul_sep_phase_not_the_hindsight_peak() -> None:
    run = {"campaigns": [synthetic_campaign_row(1982, 0.99, "El Niño")]}
    [point] = market.campaign_points(run, {})
    assert point.enso_phase == "el_nino"  # the peak of 1982/83 was strong, but JAS was +0.99
    assert point.soybean_yield_anomaly_pct is None  # missing stays null, never zero


def synthetic_decision(oni_jas: float) -> dict[str, Any]:
    return {
        "scenario_manifest": {
            "decision": {
                "campaign": "2026/27",
                "decision_date": "2026-08-31",
                "oni_jas": oni_jas,
                "enso_phase_jas": "strong El Niño",
                "gwetroot_end_aug": 0.65,
                "gwetroot_percentile_vs_past": 0.5,
            }
        }
    }


def test_outside_historical_range_needs_a_value_above_every_past_campaign() -> None:
    rows = [
        synthetic_campaign_row(1997, 1.79, "strong El Niño"),
        synthetic_campaign_row(2015, 1.73, "strong El Niño"),
    ]
    points = market.campaign_points({"campaigns": rows}, {})
    above = market.current_campaign(synthetic_decision(2.16), points)
    assert above.outside_historical_range
    assert (above.highest_past_oni_jas, above.highest_past_oni_campaign) == (1.79, "1997/98")
    equal = market.current_campaign(synthetic_decision(1.79), points)
    assert not equal.outside_historical_range


def test_highest_past_oni_tie_goes_to_the_earliest_campaign() -> None:
    rows = [
        synthetic_campaign_row(2015, 1.73, "strong El Niño"),
        synthetic_campaign_row(1997, 1.73, "strong El Niño"),
    ]
    points = market.campaign_points({"campaigns": rows}, {})
    assert market.highest_past_oni(points) == (1.73, "1997/98")


# Water episodes -----------------------------------------------------------------------------


def synthetic_water_run(
    run_id: str, strategy: str, start_year: int, deficit_mm: float, versus_mm: float, ref_id: str
) -> WaterRunSummary:
    return WaterRunSummary.model_validate(
        {
            "run_id": run_id,
            "strategy_id": strategy,
            "start_year": start_year,
            "depth_m": 1.0,
            "initial_water_fraction": 0.5,
            "summer_shift_days": 0,
            "capacity_mm": 109.05,
            "summary": {
                "initial_water_mm": 54.5,
                "water_end_mm": 60.0,
                "precip_mm": 3000.0,
                "et_actual_mm": 2000.0,
                "crop_et_deficit_mm": deficit_mm,
                "excess_above_capacity_mm": 900.0,
                "crop_days": 430,
                "max_abs_mass_residual_mm": 0.0,
                "crop_et_potential_mm": 2000.0,
                "crop_et_actual_mm": 1200.0,
                "crop_demand_unmet_fraction": 0.4,
            },
            "start": f"{start_year}-06-01",
            "end": f"{start_year + 3}-05-31",
            "daily_path": f"daily/{run_id}.json.gz",
            "versus_reference_rotation": {
                "reference_run_id": ref_id,
                "crop_et_deficit_mm": versus_mm,
                "water_end_mm": 0.0,
            },
        }
    )


def synthetic_crop(label: str, year: int, mid_stress: int, mid_heat: int) -> CropResult:
    stage = {
        "days": 20,
        "crop_et_deficit_mm": 5.0,
        "stress_days": 1,
        "longest_stress_spell_days": 1,
    }
    return CropResult.model_validate(
        {
            "event_id": f"{label}-{year}",
            "crop_id": label.lower(),
            "label": label,
            "campaign_year": year,
            "sowing_date": f"{year}-10-21",
            "end_date": f"{year + 1}-03-01",
            "stage_lengths": [20, 35, 60, 25],
            "kc_initial": 0.3,
            "kc_mid": 1.2,
            "kc_end": 0.5,
            "depletion_fraction": 0.55,
            "water_at_sowing_mm": 50.0,
            "et_potential_mm": 600.0,
            "et_actual_mm": 500.0,
            "crop_et_deficit_mm": 100.0,
            "crop_days": 130,
            "stages": [
                {
                    "stage": name,
                    "start": f"{year}-10-21",
                    "end": f"{year}-11-10",
                    "hot_days_above_35_c": 0,
                    "coincident_stress_heat_days": mid_heat if name == "mid_season" else 0,
                    **(stage | {"stress_days": mid_stress if name == "mid_season" else 1}),
                }
                for name in ("initial", "development", "mid_season", "late_season")
            ],
        }
    )


class FakeDetail:
    """Stands in for `WaterRunDetail`: the builder only reads `crops` (see `water.RunDetail`)."""

    def __init__(self, crops: list[CropResult]) -> None:
        self.crops = crops


def test_analog_campaign_joins_the_water_episode_that_starts_in_june_of_its_start_year() -> None:
    scenarios = water.analog_scenarios(["1997/98", "1987/88", "2023/24"])
    assert scenarios == {1997: "analog:1997/98", 1987: "analog:1987/88", 2023: "analog:2023/24"}
    loaded: list[str] = []

    def load_run(run_id: str) -> FakeDetail:
        loaded.append(run_id)
        return FakeDetail([synthetic_crop("Maize", 1997, mid_stress=10, mid_heat=2)])

    analog = synthetic_water_run("a" * 20, "winter-wheat", 1997, 90.0, -10.0, "b" * 20)
    other = synthetic_water_run("c" * 20, "winter-wheat", 2000, 90.0, -10.0, "d" * 20)
    in_analog = water.episode(analog, scenarios.get(analog.start_year), load_run)
    not_analog = water.episode(other, scenarios.get(other.start_year), load_run)
    assert in_analog.scenario_id == "analog:1997/98"
    assert in_analog.strategy_id == "wheat-soy2-maize-soy"
    [crop] = in_analog.crops
    # Stress days and coincident stress-heat days are the mid-season ones, not another stage.
    assert (crop.mid_season_stress_days, crop.coincident_stress_heat_days) == (10, 2)
    assert not_analog.scenario_id is None
    assert not_analog.crops == []
    assert loaded == ["a" * 20]  # daily files are read only for analog episodes


def test_deficit_vs_current_is_negative_when_the_strategy_leaves_less_water_unmet() -> None:
    reference = synthetic_water_run("b" * 20, "mapped-reference", 1997, 150.0, 0.0, "b" * 20)
    wheat = synthetic_water_run("a" * 20, "winter-wheat", 1997, 100.0, -50.0, "b" * 20)
    episode = water.episode(wheat, None, lambda _: FakeDetail([]))
    assert episode.deficit_vs_current_mm == -50.0
    assert episode.crop_et_deficit_mm < reference.summary.crop_et_deficit_mm


def test_reference_sign_check_rejects_a_flipped_paired_difference() -> None:
    reference = synthetic_water_run("b" * 20, "mapped-reference", 1997, 150.0, 0.0, "b" * 20)
    good = synthetic_water_run("a" * 20, "winter-wheat", 1997, 100.0, -50.0, "b" * 20)
    flipped = synthetic_water_run("c" * 20, "winter-wheat", 1997, 100.0, 50.0, "b" * 20)
    water.check_reference_sign([reference, good])
    with pytest.raises(ValueError, match="sign"):
        water.check_reference_sign([reference, flipped])


# Unharvested area ---------------------------------------------------------------------------


def test_unharvested_percentage_math() -> None:
    assert unharvested.unharvested_pct(1000, 750) == pytest.approx(25.0)
    assert unharvested.unharvested_pct(1000, 1000) == 0.0
    # Nothing harvested is a real 100% loss; nothing planted has no share to report.
    assert unharvested.unharvested_pct(500, 0) == 100.0
    assert unharvested.unharvested_pct(0, 0) is None
    with pytest.raises(ValueError, match="above planted"):
        unharvested.unharvested_pct(100, 120)


def test_campaigns_without_planted_area_are_skipped_not_counted_as_zero() -> None:
    area = {2015: (1000.0, 800.0), 2016: (0.0, 0.0), 2017: (500.0, 0.0)}
    assert unharvested.pct_by_campaign(area, [2015, 2016, 2017, 2018]) == {2015: 20.0, 2017: 100.0}


def test_unharvested_rows_group_by_phase_with_n_mean_and_worst_campaign() -> None:
    pct = {1997: 4.0, 2015: 26.0, 2016: 0.0, 2002: 10.0}
    phases = {1997: "strong_el_nino", 2015: "strong_el_nino", 2016: "neutral", 2002: "el_nino"}
    rows = {r.enso_phase: r for r in unharvested.rows_for_crop("Soybean", pct, phases)}
    strong = rows["strong_el_nino"]
    assert (strong.campaigns, strong.mean_pct, strong.max_pct) == (2, 15.0, 26.0)
    assert strong.max_campaign == "2015/16"
    # A phase where nothing was ever lost has no campaign to name.
    assert (rows["neutral"].max_pct, rows["neutral"].max_campaign) == (0.0, None)
    # A phase with no campaign keeps its row, with missing values rather than zeros.
    empty = rows["la_nina"]
    assert empty.campaigns == 0
    assert (empty.mean_pct, empty.max_pct, empty.max_campaign) == (None, None, None)


# Lots and crop map --------------------------------------------------------------------------

SQUARE = [
    [[-60.60, -33.90], [-60.59, -33.90], [-60.59, -33.89], [-60.60, -33.89], [-60.60, -33.90]]
]
CURVE = [0.3, 0.4, 0.5, 0.7, 0.9, 0.8, 0.6, 0.4, 0.3]  # peaks in January (index 4)
PAST = [("20/21", 1, "Soybean"), ("21/22", 0, "Maize"), ("22/23", 7, "Second soybean")]


def synthetic_record(
    campaign: str, crop_code: int | None, crop: str, **overrides: object
) -> dict[str, Any]:
    record = {
        "campaign": campaign,
        "source": "INTA",
        "crop_code": crop_code,
        "crop": crop,
        "purity": 0.95,
        "curve": CURVE,
        "phase_code": "nina",
        "phase": "La Niña",
        "oni": -0.9,
        "vigor": 0.85,
        "zone_vigor": 0.9,
        "gap": -0.07,
        "lag": 0,
        "even": 0.9,
        "zone_curve": CURVE,
    }
    return record | overrides


def synthetic_field(
    field_id: str = "L05", status_code: str = "watch", **latest: object
) -> dict[str, Any]:
    """One SYNTHETIC crop-map field: three INTA campaigns and a modeled 25/26 of maize."""
    history = [synthetic_record(*row) for row in PAST]
    history.append(synthetic_record("25/26", 0, "Maize", source="model") | latest)
    return {
        "type": "Feature",
        "geometry": {"type": "Polygon", "coordinates": SQUARE},
        "properties": {
            "id": field_id,
            "name": "Lot 5",
            "own": field_id.startswith("L"),
            "farm": "La Celina",
            "ha": 26.9,
            "status_code": status_code,
            "status": status_code.title(),
            "reason": "Spanish or English text that the case never reuses.",
            "crop": history[-1]["crop"],
            "confidence": 0.8,
            "history": history,
        },
    }


def lot(**kwargs: object) -> Lot:
    return fieldblock.lot_from_crop_map(CropField.model_validate(synthetic_field(**kwargs)))


def reason(**kwargs: object) -> str:
    field = CropField.model_validate(synthetic_field(**kwargs))
    return fieldblock.status_reason(field.properties, field.properties.history[-1])


def test_lot_keeps_past_campaigns_as_history_and_the_model_as_latest() -> None:
    own = lot()
    assert (own.name, own.latest_crop, own.status) == ("Lot 5", "Maize", "watch")
    assert (own.latest_campaign, own.latest_crop_source) == ("2025/26", "model")
    assert own.is_demo_farm
    assert [(h.campaign, h.crop, h.source) for h in own.history] == [
        ("2020/21", "Soybean", "INTA"),
        ("2021/22", "Maize", "INTA"),
        ("2022/23", "Second soybean", "INTA"),
    ]
    assert own.vigor_gap == -0.07
    assert own.zone_ndvi_curve == CURVE
    neighbour = lot(field_id="N0088")
    assert (neighbour.name, neighbour.is_demo_farm) == ("Field N0088", False)


def test_a_latest_campaign_that_is_not_the_modeled_2025_26_stops_the_build() -> None:
    with pytest.raises(ValueError, match="2025/26"):
        lot(source="INTA")
    with pytest.raises(ValueError, match="2025/26"):
        lot(campaign="24/25")


def test_status_reason_is_written_from_the_numbers() -> None:
    text = reason()
    assert text.startswith("Peak summer greenness 7% below that of maize fields in the zone.")
    assert "Spanish" not in text
    assert "above" in reason(status_code="ok", gap=0.04)
    assert "equal to" in reason(status_code="ok", gap=0.004)
    uneven = reason(even=0.6, purity=0.5)
    assert "Only 60% of the lot grows evenly" in uneven
    assert "The model sees maize in only 50% of the lot" in uneven
    second = reason(crop_code=7, crop="Second soybean")
    assert "second-crop soybean fields" in second


def test_late_peak_is_flagged_only_from_the_curves() -> None:
    late = [*CURVE[:4], 0.6, 0.9, *CURVE[6:]]  # peaks in February, a month after the zone
    text = reason(curve=late, gap=0.02, status_code="ok")
    assert "February, one month later than the zone: possible late sowing." in text


def test_check_and_bare_lots_name_no_purity_and_say_why() -> None:
    no_zone = {"zone_vigor": None, "gap": None, "lag": None, "even": None, "zone_curve": None}
    unrecognized = lot(status_code="check", crop_code=5, crop="Non-agricultural", **no_zone)
    assert unrecognized.status == "check"
    assert unrecognized.crop_purity is None  # the purity belongs to a class that is not a crop
    assert unrecognized.zone_ndvi_curve == [None] * 9
    assert "does not recognize a summer crop" in (unrecognized.status_reason or "")
    assert "peak NDVI 0.85" in (unrecognized.status_reason or "")
    few = lot(status_code="check", crop_code=2, crop="Sunflower", **no_zone)
    assert "Too few sunflower fields" in (few.status_reason or "")
    bare = lot(status_code="bare", crop_code=4, crop="Fallow", vigor=0.25, **no_zone)
    assert "almost no vegetation" in (bare.status_reason or "")
    assert bare.latest_crop == "Fallow"


def test_a_compared_status_without_a_zone_comparison_stops_the_build() -> None:
    with pytest.raises(ValueError, match="no zone comparison"):
        reason(status_code="ok", gap=None)


def test_unclassified_campaign_has_no_crop() -> None:
    assert lot(crop_code=None, crop="No data", status_code="check", gap=None).latest_crop is None


def synthetic_map(features: list[dict[str, Any]], latest: str = "25/26") -> dict[str, Any]:
    return {
        "type": "FeatureCollection",
        "meta": {
            "zone": "pergamino",
            "lang": "en",
            "campaigns": ["20/21", "21/22", "22/23", latest],
            "latest": latest,
            "farm": "La Celina",
            "farm_is_synthetic": True,
            "enso": {},
            "current": {
                "campaign": "26/27",
                "phase_code": "nino",
                "phase": "El Niño",
                "strength": "strong",
                "oni": 2.16,
            },
            "sources": ["NASA HLS"],
        },
        "features": features,
    }


def test_read_lots_puts_the_farm_first_and_checks_the_campaign(tmp_path: Path) -> None:
    path = tmp_path / "lots_pergamino_en.geojson"
    features = [synthetic_field("N0002"), synthetic_field("L10"), synthetic_field("L02")]
    path.write_text(json.dumps(synthetic_map(features)), encoding="utf-8")
    lots, field_map = fieldblock.read_lots(path)
    assert [lot.field_id for lot in lots] == ["L02", "L10", "N0002"]
    assert field_map.meta.farm == "La Celina"
    path.write_text(json.dumps(synthetic_map(features, latest="24/25")), encoding="utf-8")
    with pytest.raises(ValueError, match="campaign"):
        fieldblock.read_lots(path)


def test_unknown_inta_labels_are_marked_never_passed_off_as_crops() -> None:
    assert fieldblock.translate_inta_label("Maiz") == "Maize"
    assert fieldblock.translate_inta_label("Algo nuevo") == "Algo nuevo (INTA label)"


def test_reference_footprint_is_matched_to_its_lot_by_center_and_area() -> None:
    reference = ReferenceField(
        field_id="268949",
        area_ha=27.5,
        polygon=SQUARE,
        crop_history=[],
        ndvi=[],
        soil_capacity=[],
        note="synthetic",
    )
    same = lot(field_id="N0088")  # same square, 26.9 ha: within 5%
    assert fieldblock.lot_of_reference(reference, [lot(), same]) is not None
    # Many extra vertices along one edge move a vertex mean but not the area centroid.
    edge = [[-60.59, -33.90 + 0.01 * k / 20] for k in range(1, 20)]
    ring = SQUARE[0]
    dense = same.model_copy(update={"polygon": [[*ring[:2], *edge, *ring[2:]]]})
    assert fieldblock.lot_of_reference(reference, [dense]) is not None
    moved = [[[x + 0.01, y] for x, y in ring] for ring in SQUARE]
    far = same.model_copy(update={"polygon": moved})
    smaller = same.model_copy(update={"area_ha": 20.0})
    assert fieldblock.lot_of_reference(reference, [far, smaller]) is None
