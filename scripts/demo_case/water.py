"""The water block of the Pergamino case, from the released water scenarios (`strategies-v1`)."""

from collections.abc import Callable
from typing import Protocol

from common import scenario_id

from app.modules.cases.schemas import (
    BlockMeta,
    PairedCounts,
    SoilCapacity,
    WaterBlock,
    WaterCrop,
    WaterEpisode,
    WaterStartingPoint,
)
from app.modules.water.schemas import (
    CropResult,
    DifferenceDistribution,
    StrategiesBundle,
    WaterRunSummary,
)

# Water strategy id -> bundle strategy id (see the crosswalk table of the case contract).
WATER_TO_BUNDLE = {
    "mapped-reference": "maize-soy-soy",
    "summer-maize": "maize-soy",
    "winter-wheat": "wheat-soy2-maize-soy",
}
REFERENCE_STRATEGY = "mapped-reference"
MID_SEASON = "mid_season"
TOLERANCE_MM = 1e-6


class RunDetail(Protocol):
    """What the builder reads from a released daily run: its crops."""

    crops: list[CropResult]


RunLoader = Callable[[str], RunDetail]


def bundle_strategy(water_strategy_id: str) -> str:
    return WATER_TO_BUNDLE[water_strategy_id]


def analog_scenarios(analog_campaigns: list[str]) -> dict[int, str]:
    """Water episodes start in June of the campaign start year: 1997 <-> 'analog:1997/98'."""
    return {int(label[:4]): scenario_id(label) for label in analog_campaigns}


def deficit_vs_current_mm(run: WaterRunSummary) -> float:
    """Unmet crop water of the run minus that of the current rotation, same soil and calendar.

    Negative means the strategy leaves less crop water unmet than the current rotation.
    """
    return run.versus_reference_rotation.crop_et_deficit_mm


def check_reference_sign(runs: list[WaterRunSummary]) -> None:
    """The released difference must be run minus reference; the builder relies on that sign."""
    deficit = {run.run_id: run.summary.crop_et_deficit_mm for run in runs}
    for run in runs:
        reference = deficit[run.versus_reference_rotation.reference_run_id]
        if abs((deficit[run.run_id] - reference) - deficit_vs_current_mm(run)) > TOLERANCE_MM:
            raise ValueError(f"Unexpected sign of the paired difference in run {run.run_id}")


def water_crop(crop: CropResult) -> WaterCrop:
    """One crop of an analog episode, with its mid-season stress and coincident stress-heat days."""
    stages = {stage.stage: stage for stage in crop.stages}
    mid = stages[MID_SEASON]
    return WaterCrop(
        crop=crop.label,
        campaign_year=crop.campaign_year,
        sowing_date=crop.sowing_date,
        water_at_sowing_mm=crop.water_at_sowing_mm,
        crop_et_deficit_mm=crop.crop_et_deficit_mm,
        mid_season_stress_days=mid.stress_days,
        coincident_stress_heat_days=mid.coincident_stress_heat_days,
    )


def episode(run: WaterRunSummary, scenario: str | None, load_run: RunLoader) -> WaterEpisode:
    summary = run.summary
    crops = [water_crop(crop) for crop in load_run(run.run_id).crops] if scenario else []
    return WaterEpisode(
        run_id=run.run_id,
        strategy_id=bundle_strategy(run.strategy_id),
        start_year=run.start_year,
        scenario_id=scenario,
        depth_m=run.depth_m,
        initial_water_fraction=run.initial_water_fraction,
        summer_shift_days=run.summer_shift_days,
        crop_et_potential_mm=summary.crop_et_potential_mm,
        crop_et_deficit_mm=summary.crop_et_deficit_mm,
        crop_demand_unmet_fraction=summary.crop_demand_unmet_fraction,
        excess_above_capacity_mm=summary.excess_above_capacity_mm,
        water_end_mm=summary.water_end_mm,
        deficit_vs_current_mm=deficit_vs_current_mm(run),
        crops=crops,
    )


def paired_counts(
    strategy_id: str,
    depth_m: float,
    fraction: float,
    shift_days: int,
    distribution: DifferenceDistribution,
) -> PairedCounts:
    return PairedCounts(
        strategy_id=bundle_strategy(strategy_id),
        depth_m=depth_m,
        initial_water_fraction=fraction,
        summer_shift_days=shift_days,
        count=distribution.count,
        lower_count=distribution.lower_count,
        equal_count=distribution.equal_count,
        higher_count=distribution.higher_count,
        median_mm=distribution.median_mm,
        minimum_mm=distribution.minimum_mm,
        maximum_mm=distribution.maximum_mm,
    )


def soil_capacities(bundle: StrategiesBundle) -> list[SoilCapacity]:
    # The release stores 109.05000000000001; capacities are published to 0.01 mm.
    return [
        SoilCapacity(
            depth_m=float(soil["depth_m"]), capacity_mm=round(float(soil["capacity_mm"]), 2)
        )
        for soil in bundle.soils
    ]


def starting_points(bundle: StrategiesBundle) -> list[WaterStartingPoint]:
    """Every soil depth crossed with every initial water fraction of the release."""
    capacity = {soil.depth_m: soil.capacity_mm for soil in soil_capacities(bundle)}
    config = bundle.config
    return [
        WaterStartingPoint(
            depth_m=float(depth),
            capacity_mm=capacity[float(depth)],
            initial_water_fraction=float(fraction),
        )
        for depth in config["depths_m"]
        for fraction in config["initial_water_fractions"]
    ]


def build_water_block(
    bundle: StrategiesBundle, analog_campaigns: list[str], load_run: RunLoader, meta: BlockMeta
) -> WaterBlock:
    """The 1,170 released runs as episodes; only analog start years carry per-crop detail."""
    check_reference_sign(bundle.runs)
    scenarios = analog_scenarios(analog_campaigns)
    config = bundle.config
    calendar_depth = float(config["calendar_depth_m"])
    calendar_fraction = float(config["calendar_initial_fraction"])
    return WaterBlock(
        field_id=str(bundle.field["field_id"]),
        meta=meta,
        starting_points=starting_points(bundle),
        default_depth_m=calendar_depth,
        default_initial_water_fraction=calendar_fraction,
        summer_shift_days=[int(days) for days in config["summer_shift_days"]],
        episodes=[episode(run, scenarios.get(run.start_year), load_run) for run in bundle.runs],
        robustness=[
            paired_counts(
                item.strategy_id,
                item.depth_m,
                item.initial_water_fraction,
                0,
                item.deficit_difference,
            )
            for item in bundle.robustness
        ],
        calendar_effects=[
            paired_counts(
                item.strategy_id,
                calendar_depth,
                calendar_fraction,
                item.summer_shift_days,
                item.deficit_difference,
            )
            for item in bundle.calendar_effects
        ],
        limitations=list(bundle.limitations),
    )
