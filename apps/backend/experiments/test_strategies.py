"""Synthetic fixtures isolate unit, calendar, attribution and paired-comparison errors."""

import copy
from datetime import date, timedelta

import pytest

from experiments.strategies import (
    delta,
    distribution,
    make_events,
    pair_runs,
    soil_capacity,
    stage_summaries,
)


def synthetic_soil() -> dict:
    return {
        "rows": [
            {
                "property": prop,
                "depth_top_cm": top,
                "depth_bottom_cm": bottom,
                "statistic": "mean",
                "quality_flag": "valid",
                "value": value,
                "unit": "10-2 cm³/cm³",
            }
            for top, bottom in ((0, 5), (5, 15), (15, 30), (30, 60), (60, 100))
            for prop, value in (("wv0033", 33), ("wv1500", 15))
        ]
    }


def test_soil_integrates_depth_and_percent_units() -> None:
    assert soil_capacity(synthetic_soil(), 0.6)["capacity_mm"] == pytest.approx(108)
    assert soil_capacity(synthetic_soil(), 1.0)["capacity_mm"] == pytest.approx(180)


@pytest.mark.parametrize("defect", ["missing", "unit", "reversed", "duplicate", "nonfinite"])
def test_bad_soil_fails_instead_of_becoming_a_capacity(defect: str) -> None:
    soil = synthetic_soil()
    if defect == "missing":
        soil["rows"].pop(0)
    elif defect == "unit":
        soil["rows"][0]["unit"] = "fraction"
    elif defect == "reversed":
        soil["rows"][0]["value"] = 10
    elif defect == "duplicate":
        soil["rows"].append(soil["rows"][0])
    else:
        soil["rows"][0]["value"] = float("nan")
    with pytest.raises(ValueError, match=r"profile|unit|capacity|Duplicate|retention"):
        soil_capacity(soil, 0.6)


def synthetic_calendar() -> tuple[dict, dict]:
    crop = {"sowing_month_day": "12-18", "stage_lengths": [20, 35, 60, 25]}
    crops = {
        "soybean_second": crop,
        "wheat": {"sowing_month_day": "06-10", "stage_lengths": [20, 25, 60, 30]},
    }
    strategy = {"strategy_id": "synthetic", "sequence": [["wheat", "soybean_second"]]}
    return strategy, crops


def test_shift_changes_summer_calendar_across_new_year_but_preserves_winter() -> None:
    strategy, crops = synthetic_calendar()
    original = make_events(strategy, 2022, crops, 0)
    shifted = make_events(strategy, 2022, crops, 14)
    assert original[0] == shifted[0]
    assert shifted[1]["sowing_date"] == "2023-01-01"
    assert shifted[1]["stage_lengths"] == original[1]["stage_lengths"]
    assert make_events(strategy, 2022, crops, 0) == original


def test_calendar_rejects_overlap_and_incomplete_campaign() -> None:
    strategy, crops = synthetic_calendar()
    with pytest.raises(ValueError, match="overlap"):
        make_events(strategy, 2022, crops, -90)
    with pytest.raises(ValueError, match="crosses"):
        make_events(strategy, 2022, crops, 40)


def test_stages_partition_deficit_and_reset_spells() -> None:
    crop = {
        "event_id": "synthetic",
        "sowing_date": "2024-02-27",
        "stage_lengths": [2] * 4,
        "crop_et_deficit_mm": 8.0,
    }
    days = [(date(2024, 2, 27) + timedelta(days=i)).isoformat() for i in range(8)]
    daily = {
        d: {"crop_event_id": "synthetic", "water_stress_coefficient": 0.5, "crop_et_deficit_mm": 1}
        for d in days
    }
    maximum = {d: 36.0 if i % 2 == 0 else 35.0 for i, d in enumerate(days)}
    stages = stage_summaries(crop, daily, maximum)
    assert stages[1]["start"] == "2024-02-29"
    assert sum(s["crop_et_deficit_mm"] for s in stages) == 8
    assert [s["longest_stress_spell_days"] for s in stages] == [2] * 4
    assert [s["coincident_stress_heat_days"] for s in stages] == [1] * 4
    daily[days[3]]["crop_event_id"] = "another_crop"
    with pytest.raises(ValueError, match="attribution"):
        stage_summaries(crop, daily, maximum)


def test_pairing_uses_same_year_depth_water_and_calendar() -> None:
    runs: list[dict] = [
        {
            "strategy_id": strategy,
            "start_year": 2000,
            "depth_m": 1,
            "initial_water_fraction": 0.5,
            "summer_shift_days": shift,
            "run_id": f"{strategy}-{shift}",
            "summary": {"crop_et_deficit_mm": deficit, "water_end_mm": 10},
        }
        for strategy, shift, deficit in (
            ("base", 0, 20),
            ("other", 0, 15),
            ("base", 7, 22),
            ("other", 7, 12),
        )
    ]
    robustness, calendar = pair_runs(runs, "base")
    assert runs[3]["versus_reference_rotation"]["crop_et_deficit_mm"] == -10
    assert runs[3]["versus_unshifted_calendar"]["crop_et_deficit_mm"] == -3
    assert robustness[1]["deficit_difference"]["lower_count"] == 1
    assert calendar[1]["deficit_difference"]["median_mm"] == -3
    wrong = copy.deepcopy(runs[0])
    wrong["initial_water_fraction"] = 0.25
    with pytest.raises(ValueError, match="Cannot pair"):
        delta(runs[1], wrong)
    with pytest.raises(ValueError, match="Duplicate"):
        pair_runs([*runs, runs[0]], "base")


def test_historical_counts_include_equal_cases_and_are_not_probabilities() -> None:
    result = distribution([-3, 0, 2, 4])
    assert result == {
        "count": 4,
        "minimum_mm": -3,
        "median_mm": 1,
        "maximum_mm": 4,
        "lower_count": 1,
        "equal_count": 1,
        "higher_count": 2,
    }
