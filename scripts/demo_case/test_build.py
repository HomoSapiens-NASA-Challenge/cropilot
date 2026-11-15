"""Checks where a wrong number or label would mislead an agronomist reading the demo case.

Run with the backend environment from `apps/backend`:
    uv run pytest -c pyproject.toml ../../scripts/demo_case/test_build.py
Every fixture below is SYNTHETIC: small inline data that mimics the shape of the real inputs.
"""

import math
from typing import Any

import fieldblock
import market
import pytest
import unharvested
import water
from common import BUNDLE_STRATEGY, MARKET_ROTATION, STRATEGY_IDS

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


def synthetic_own_feature(**overrides: object) -> dict[str, Any]:
    props = {
        "id": "L05",
        "own": True,
        "name": "Lote 5",
        "farm": "La Celina",
        "ha": 26.9,
        "curve": CURVE,
        "history": ["Soja", "Maíz", "Soja", "Soja", "Maíz"],  # newest first, as in the prototype
        "purity": 0.99,
        "crop": "Maíz",
        "status": "Atención",
        "reason": "Vigor 7 % por debajo de los lotes de maíz de la zona.",
        "vigor": 0.8,
        "gap": -0.07,
        "even": 0.9,
        "zone": CURVE,
    }
    return {"geometry": {"coordinates": SQUARE}, "properties": props | overrides}


HISTORY = ["2020/21", "2021/22", "2022/23", "2023/24", "2024/25"]


def test_lot_crop_status_and_name_are_translated() -> None:
    lot = fieldblock.own_lot(synthetic_own_feature(), HISTORY)
    assert (lot.name, lot.latest_crop, lot.status) == ("Lot 5", "Maize", "watch")
    assert lot.latest_crop_source == "model"
    assert lot.is_demo_farm
    # History is oldest first and the prototype list is newest first.
    assert [(h.campaign, h.crop) for h in lot.history] == [
        ("2020/21", "Maize"),
        ("2021/22", "Soybean"),
        ("2022/23", "Soybean"),
        ("2023/24", "Maize"),
        ("2024/25", "Soybean"),
    ]
    assert all(h.source == "INTA" for h in lot.history)


@pytest.mark.parametrize(
    ("spanish", "english"),
    [
        ("Bien", "ok"),
        ("Atención", "watch"),
        ("Alerta", "alert"),
        ("A verificar", "check"),
        ("Sin cultivo", "bare"),
    ],
)
def test_every_prototype_status_has_a_contract_status(spanish: str, english: str) -> None:
    assert fieldblock.PROTOTYPE_STATUS[spanish] == english


def test_unverified_lot_has_no_crop_and_status_check() -> None:
    feature = synthetic_own_feature(
        crop="A verificar",
        status="A verificar",
        gap=None,
        even=None,
        zone=None,
        vigor=0.73,
        reason="El modelo no lo reconoce como maíz, soja, girasol ni sorgo.",
    )
    lot = fieldblock.own_lot(feature, HISTORY)
    assert lot.latest_crop is None
    assert lot.status == "check"
    assert lot.crop_purity is None  # the purity belonged to a class that is not named
    assert lot.zone_ndvi_curve == [None] * 9
    assert "peak NDVI 0.73" in (lot.status_reason or "")


def test_status_reason_is_english_and_written_from_the_numbers_not_the_spanish_text() -> None:
    spanish = "Vigor 7 % por debajo de los lotes de maíz de la zona."
    reason = fieldblock.status_reason(synthetic_own_feature(reason=spanish)["properties"])
    assert reason is not None
    assert reason != spanish
    assert "7% below" in reason
    assert "maize fields" in reason
    assert "por debajo" not in reason
    assert "Vigor" not in reason
    uneven = fieldblock.status_reason(synthetic_own_feature(even=0.6, purity=0.5)["properties"])
    assert uneven is not None
    assert "Only 60% of the lot grows evenly" in uneven
    assert "only 50% of the lot" in uneven


def test_late_peak_is_flagged_only_from_the_curves() -> None:
    late = [*CURVE[:4], 0.6, 0.9, *CURVE[6:]]  # peaks in February, a month after the zone
    reason = fieldblock.status_reason(synthetic_own_feature(curve=late, gap=0.02)["properties"])
    assert "February, one month later than the zone: possible late sowing" in reason


def test_unknown_labels_stop_or_are_marked_never_passed_off_as_crops() -> None:
    with pytest.raises(KeyError):
        fieldblock.translate_prototype_crop("Lino")
    assert fieldblock.translate_inta_label("Maiz") == "Maize"
    assert fieldblock.translate_inta_label("Algo nuevo") == "Algo nuevo (INTA label)"
    assert fieldblock.translate_prototype_crop("Sin dato") is None


def test_context_lot_has_only_an_area_and_nulls() -> None:
    feature = {"geometry": {"coordinates": SQUARE}, "properties": {"id": "N001", "own": False}}
    lot = fieldblock.context_lot(feature)
    assert not lot.is_demo_farm
    assert lot.latest_crop is None
    assert lot.status is None
    assert lot.history == []
    assert lot.ndvi_curve == [None] * 9
    # 0.01 deg x 0.01 deg at 33.9 S is about 102.5 ha.
    assert lot.area_ha == pytest.approx(102.5, rel=0.01)
    assert math.isclose(fieldblock.polygon_area_ha(SQUARE), lot.area_ha, rel_tol=0.001)
