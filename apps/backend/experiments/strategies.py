"""Reproducible Pergamino water scenarios using the verified, unchanged water-v1 engine."""

import argparse
import gzip
import hashlib
import importlib
import json
import math
import statistics
import sys
import zipfile
from datetime import date, timedelta
from pathlib import Path
from types import ModuleType

STAGES = ("initial", "development", "mid_season", "late_season")
SOURCE_IDS = [
    "pergamino_snapshot",
    "nasa_power",
    "soilgrids",
    "inta_maps",
    "fao56",
    "calendar",
    "engine",
]
INPUTS = (
    "context/simulator_power_1984_2025.json",
    "context/soilgrids_point_demo_field.json",
    "fields/selection.json",
    "fields/demo_field.geojson",
)


def digest(value: object) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, allow_nan=False).encode()).hexdigest()


def encode(value: object) -> bytes:
    return json.dumps(value, separators=(",", ":"), allow_nan=False).encode()


def read_inputs(archive: Path, expected: str) -> tuple[dict, dict]:
    if hashlib.sha256(archive.read_bytes()).hexdigest() != expected:
        raise ValueError("Pergamino archive checksum mismatch")
    with zipfile.ZipFile(archive) as handle:
        if len(handle.namelist()) != len(set(handle.namelist())):
            raise ValueError("Duplicate archive members")
        raw = {name: handle.read(name) for name in INPUTS}
    return (
        {name: json.loads(content) for name, content in raw.items()},
        {name: hashlib.sha256(content).hexdigest() for name, content in raw.items()},
    )


def soil_capacity(profile: dict, depth_m: float) -> dict:
    """Integrate layer means, retaining source units; quantiles are not joint intervals."""
    if not math.isfinite(depth_m) or depth_m <= 0:
        raise ValueError("Positive finite soil depth required")
    rows = [r for r in profile["rows"] if r["statistic"] == "mean"]
    by_key = {(r["property"], r["depth_top_cm"], r["depth_bottom_cm"]): r for r in rows}
    if len(by_key) != len(rows):
        raise ValueError("Duplicate soil layer")
    layers, covered, capacity = [], 0.0, 0.0
    for top, bottom in ((0, 5), (5, 15), (15, 30), (30, 60), (60, 100), (100, 200)):
        thickness = min(bottom, depth_m * 100) - top
        if thickness <= 0:
            break
        values = []
        for prop in ("wv0033", "wv1500"):
            row = by_key.get((prop, top, bottom))
            if row is None or row["quality_flag"] != "valid" or row["value"] is None:
                raise ValueError("Incomplete water-retention profile")
            if row["unit"] != "10-2 cm³/cm³":
                raise ValueError("Unexpected SoilGrids retention unit")
            value = float(row["value"]) / 100
            if not math.isfinite(value) or not 0 <= value <= 1:
                raise ValueError("Invalid water retention")
            values.append(value)
        field_capacity, wilting = values
        if field_capacity <= wilting:
            raise ValueError("Field capacity must exceed wilting point")
        available = (field_capacity - wilting) * thickness * 10
        capacity += available
        covered += thickness
        layers.append(
            {
                "top_cm": top,
                "bottom_cm": top + thickness,
                "field_capacity_fraction": field_capacity,
                "wilting_point_fraction": wilting,
                "capacity_mm": available,
            }
        )
    if abs(covered - depth_m * 100) > 1e-8:
        raise ValueError("Requested depth exceeds source coverage")
    return {
        "depth_m": depth_m,
        "capacity_mm": capacity,
        "layers": layers,
        "provenance": "modeled",
        "source_ids": ["soilgrids"],
        "depth_provenance": "scenario",
    }


def make_events(strategy: dict, year: int, crops: dict, shift: int) -> list[dict]:
    """Shift summer dates only, preserving complete cycles and campaign boundaries."""
    events = []
    occupied = set()
    for offset, season in enumerate(strategy["sequence"]):
        campaign_year = year + offset
        for order, crop_id in enumerate(season):
            crop = crops[crop_id]
            month, day = map(int, crop["sowing_month_day"].split("-"))
            start = date(campaign_year if month >= 6 else campaign_year + 1, month, day)
            if crop_id != "wheat":
                start += timedelta(days=shift)
            lengths = crop["stage_lengths"]
            if len(lengths) != 4 or any(type(n) is not int or n <= 0 for n in lengths):
                raise ValueError("Four positive integer stage lengths required")
            end = start + timedelta(days=sum(lengths) - 1)
            if start < date(campaign_year, 6, 1) or end >= date(campaign_year + 1, 6, 1):
                raise ValueError("Shifted crop crosses its assigned campaign")
            for i in range(sum(lengths)):
                current = start + timedelta(days=i)
                if current in occupied:
                    raise ValueError("Shifted crops overlap")
                occupied.add(current)
            events.append(
                {
                    **crop,
                    "event_id": f"{strategy['strategy_id']}-{campaign_year}-{order}",
                    "crop_id": crop_id,
                    "campaign_year": campaign_year,
                    "sowing_date": start.isoformat(),
                }
            )
    return events


def longest_spell(flags: list[bool]) -> int:
    longest = current = 0
    for flag in flags:
        current = current + 1 if flag else 0
        longest = max(longest, current)
    return longest


def stage_summaries(crop: dict, daily: dict[str, dict], maximum_c: dict[str, float]) -> list[dict]:
    start = date.fromisoformat(crop["sowing_date"])
    stages: list[dict] = []
    for name, length in zip(STAGES, crop["stage_lengths"], strict=True):
        dates = [(start + timedelta(days=i)).isoformat() for i in range(length)]
        rows = [daily[day] for day in dates]
        if any(r["crop_event_id"] != crop["event_id"] for r in rows):
            raise ValueError("Stage and daily crop attribution disagree")
        stress = [r["water_stress_coefficient"] < 1 - 1e-9 for r in rows]
        heat = [maximum_c[day] > 35 for day in dates]
        stages.append(
            {
                "stage": name,
                "start": dates[0],
                "end": dates[-1],
                "days": length,
                "crop_et_deficit_mm": sum(r["crop_et_deficit_mm"] for r in rows),
                "stress_days": sum(stress),
                "longest_stress_spell_days": longest_spell(stress),
                "hot_days_above_35_c": sum(heat),
                "coincident_stress_heat_days": sum(
                    a and b for a, b in zip(stress, heat, strict=True)
                ),
            }
        )
        start += timedelta(days=length)
    total = sum(s["crop_et_deficit_mm"] for s in stages)
    if not math.isclose(total, crop["crop_et_deficit_mm"], abs_tol=1e-7):
        raise ValueError("Stage deficits do not reconcile with crop deficit")
    return stages


def delta(run: dict, reference: dict) -> dict:
    for key in ("start_year", "depth_m", "initial_water_fraction"):
        if run[key] != reference[key]:
            raise ValueError("Cannot pair different weather, soil or initial states")
    return {
        "reference_run_id": reference["run_id"],
        "crop_et_deficit_mm": run["summary"]["crop_et_deficit_mm"]
        - reference["summary"]["crop_et_deficit_mm"],
        "water_end_mm": run["summary"]["water_end_mm"] - reference["summary"]["water_end_mm"],
    }


def distribution(values: list[float]) -> dict:
    if not values or not all(math.isfinite(v) for v in values):
        raise ValueError("Finite paired values required")
    return {
        "count": len(values),
        "minimum_mm": min(values),
        "median_mm": statistics.median(values),
        "maximum_mm": max(values),
        "lower_count": sum(v < -1e-7 for v in values),
        "equal_count": sum(abs(v) <= 1e-7 for v in values),
        "higher_count": sum(v > 1e-7 for v in values),
    }


def pair_runs(runs: list[dict], baseline_id: str) -> tuple[list[dict], list[dict]]:
    index = {
        (
            r["strategy_id"],
            r["start_year"],
            r["depth_m"],
            r["initial_water_fraction"],
            r["summer_shift_days"],
        ): r
        for r in runs
    }
    if len(index) != len(runs):
        raise ValueError("Duplicate comparison case")
    robustness, calendar = [], []
    groups: dict[tuple, list] = {}
    calendar_groups: dict[tuple, list] = {}
    for run in runs:
        key = (run["start_year"], run["depth_m"], run["initial_water_fraction"])
        reference = index[(baseline_id, *key, run["summer_shift_days"])]
        run["versus_reference_rotation"] = delta(run, reference)
        if run["summer_shift_days"] == 0:
            group = (run["strategy_id"], run["depth_m"], run["initial_water_fraction"])
            groups.setdefault(group, []).append(
                run["versus_reference_rotation"]["crop_et_deficit_mm"]
            )
        else:
            same_calendar = index[(run["strategy_id"], *key, 0)]
            run["versus_unshifted_calendar"] = delta(run, same_calendar)
            group = (run["strategy_id"], run["summer_shift_days"])
            calendar_groups.setdefault(group, []).append(
                run["versus_unshifted_calendar"]["crop_et_deficit_mm"]
            )
    for (strategy_id, depth, fraction), values in sorted(groups.items()):
        robustness.append(
            {
                "strategy_id": strategy_id,
                "depth_m": depth,
                "initial_water_fraction": fraction,
                "deficit_difference": distribution(values),
            }
        )
    for (strategy_id, shift), values in sorted(calendar_groups.items()):
        calendar.append(
            {
                "strategy_id": strategy_id,
                "summer_shift_days": shift,
                "deficit_difference": distribution(values),
            }
        )
    return robustness, calendar


def simulate_case(
    engine: ModuleType,
    weather: list[dict],
    maximum_c: dict[str, float],
    events: list[dict],
    capacity: float,
    fraction: float,
) -> dict:
    calculation = engine.simulate(weather, events, capacity, capacity * fraction)
    if calculation["summary"]["max_abs_mass_residual_mm"] > 1e-7:
        raise ValueError("Water mass balance failed")
    daily = {r["date"]: r for r in calculation["daily"]}
    for crop in calculation["crop_events"]:
        crop["stages"] = stage_summaries(crop, daily, maximum_c)
    for row in calculation["daily"]:
        row["temperature_max_c"] = maximum_c[row["date"]]
    return calculation


def run(config: dict, archive: Path, runtime: Path, destination: Path) -> dict:
    if destination.exists():
        raise ValueError("Output must be a new directory; existing results are never overwritten")
    inputs, hashes = read_inputs(archive, config["source_sha256"])
    profile = inputs[INPUTS[1]]
    if str(profile["mapped_field_id"]) != config["field_id"]:
        raise ValueError("Soil profile belongs to another field")
    # Imports must not add bytecode files to the checksum-pinned engine directory.
    sys.dont_write_bytecode = True
    sys.path.insert(0, str(runtime))
    engine = importlib.import_module("field_water.engine")
    sources = importlib.import_module("field_water.sources")
    power = inputs[INPUTS[0]]
    weather = sources.parse_power(power)
    maximum_c = {
        date(int(k[:4]), int(k[4:6]), int(k[6:])).isoformat(): float(v)
        for k, v in power["properties"]["parameter"]["T2M_MAX"].items()
    }
    soils = [soil_capacity(profile, depth) for depth in config["depths_m"]]
    baseline = [s for s in config["strategies"] if s["is_baseline"]]
    if len(baseline) != 1 or len(config["strategies"]) < 3:
        raise ValueError("At least three strategies and exactly one reference required")
    design_id = digest({"config": config, "inputs": hashes, "engine_version": engine.MODEL_VERSION})
    destination.mkdir(parents=True)
    (destination / "daily").mkdir()
    runs, rejected = [], []
    for year in config["start_years"]:
        first, stop = date(year, 6, 1), date(year + config["campaigns"], 6, 1)
        selected = [r for r in weather if first.isoformat() <= r["date"] < stop.isoformat()]
        if len(selected) != (stop - first).days:
            raise ValueError(f"Incomplete historical episode {year}")
        for soil in soils:
            for fraction in config["initial_water_fractions"]:
                shifts = (
                    config["summer_shift_days"]
                    if (
                        soil["depth_m"] == config["calendar_depth_m"]
                        and fraction == config["calendar_initial_fraction"]
                    )
                    else [0]
                )
                for shift in shifts:
                    # Pair all strategies on exactly the same valid episode/configuration.
                    try:
                        schedules = [
                            make_events(s, year, config["crops"], shift)
                            for s in config["strategies"]
                        ]
                    except ValueError as error:
                        rejected.append(
                            {
                                "start_year": year,
                                "depth_m": soil["depth_m"],
                                "initial_water_fraction": fraction,
                                "summer_shift_days": shift,
                                "reason": str(error),
                            }
                        )
                        continue
                    for strategy, events in zip(config["strategies"], schedules, strict=True):
                        case = {
                            "strategy_id": strategy["strategy_id"],
                            "start_year": year,
                            "depth_m": soil["depth_m"],
                            "initial_water_fraction": fraction,
                            "summer_shift_days": shift,
                        }
                        identity = digest({"design_id": design_id, **case})[:20]
                        result = simulate_case(
                            engine, selected, maximum_c, events, soil["capacity_mm"], fraction
                        )
                        potential = sum(c["et_potential_mm"] for c in result["crop_events"])
                        actual = sum(c["et_actual_mm"] for c in result["crop_events"])
                        result["summary"].update(
                            crop_et_potential_mm=potential,
                            crop_et_actual_mm=actual,
                            crop_demand_unmet_fraction=1 - actual / potential,
                        )
                        campaigns = []
                        for cy in range(year, year + config["campaigns"]):
                            rows = [
                                r
                                for r in result["daily"]
                                if f"{cy}-06-01" <= r["date"] < f"{cy + 1}-06-01"
                            ]
                            campaigns.append(
                                {
                                    "start_year": cy,
                                    "water_start_mm": rows[0]["available_water_start_mm"],
                                    "water_end_mm": rows[-1]["available_water_end_mm"],
                                    "crop_et_deficit_mm": sum(
                                        r["crop_et_deficit_mm"] for r in rows
                                    ),
                                }
                            )
                        detail = {
                            "run_id": identity,
                            **case,
                            "provenance": "modeled",
                            "day_basis": "UTC",
                            "capacity_mm": soil["capacity_mm"],
                            "summary": result["summary"],
                            "campaigns": campaigns,
                            "crops": result["crop_events"],
                            "rows": result["daily"],
                        }
                        (destination / "daily" / f"{identity}.json.gz").write_bytes(
                            gzip.compress(encode(detail), mtime=0)
                        )
                        runs.append(
                            {
                                "run_id": identity,
                                **case,
                                "capacity_mm": soil["capacity_mm"],
                                "start": first.isoformat(),
                                "end": (stop - timedelta(days=1)).isoformat(),
                                "summary": result["summary"],
                                "daily_path": f"daily/{identity}.json.gz",
                            }
                        )
        sys.stderr.write(f"Completed historical episode {year}\n")
    robustness, calendar = pair_runs(runs, baseline[0]["strategy_id"])
    manifest = {
        "schema_version": "strategies-v1",
        "status": "research_only",
        "design_id": design_id,
        "field": {
            "field_id": config["field_id"],
            "label": config["label"],
            "longitude": profile["longitude"],
            "latitude": profile["latitude"],
            "current_rotation_confirmed": False,
            "spatial_support": (
                "Modeled SoilGrids point inside a satellite-estimated footprint with "
                "regional POWER weather"
            ),
        },
        "weather_point": power["geometry"]["coordinates"][:2],
        "model": {
            "id": engine.MODEL_ID,
            "version": engine.MODEL_VERSION,
            "validation_status": "not_field_validated",
        },
        "config": config,
        "soils": soils,
        "runs": runs,
        "robustness": robustness,
        "calendar_effects": calendar,
        "rejected_cases": rejected,
        "sources": [
            {
                "id": "pergamino_snapshot",
                "url": f"https://github.com/{config['source_repository']}/releases/tag/{config['source_tag']}",
                "sha256": config["source_sha256"],
                "member_sha256": hashes,
            },
            {
                "id": "nasa_power",
                "url": "https://power.larc.nasa.gov/docs/services/api/temporal/daily/",
                "period": "1984-2025",
                "day_basis": "UTC",
            },
            {
                "id": "soilgrids",
                "url": "https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_01.html",
            },
            {
                "id": "inta_maps",
                "url": "https://github.com/HomoSapiens-NASA-Challenge/hub/blob/84f5744/data/pergamino/docs/crops.md",
            },
            {"id": "fao56", "url": "https://www.fao.org/4/x0490e/x0490e00.htm"},
            {
                "id": "calendar",
                "url": "https://github.com/HomoSapiens-NASA-Challenge/simulator/blob/36ca379/docs/water-spec.md",
            },
            {
                "id": "engine",
                "url": "https://github.com/HomoSapiens-NASA-Challenge/simulator/tree/36ca379",
            },
        ],
        "source_ids": SOURCE_IDS,
        "limitations": [
            (
                "Historical scenario calculations; not forecasts, yield predictions or "
                "agronomic recommendations."
            ),
            (
                "Reference sequence follows dominant INTA mapped summer classes for "
                "2021/22-2023/24; farmer rotation and winter management are unconfirmed."
            ),
            (
                "Thirty-nine overlapping three-campaign episodes are descriptive "
                "comparisons, not independent trials or calibrated probabilities."
            ),
            (
                "Fixed 0.6/1.0 m soil profiles and 25/50/75% initial water are sensitivity "
                "assumptions, not measured roots or water."
            ),
            (
                "Soil capacity integrates mean retention at 33 minus 1500 kPa. Profile "
                "depths are not probabilistic confidence bounds."
            ),
            (
                "Generic FAO stages are calendar assumptions, not observed phenology; "
                "mid-season is not verified flowering."
            ),
            (
                "The >35 C overlap is a descriptive heat screen, not a validated damage "
                "threshold for every crop."
            ),
            (
                "Summer sowing shifts of +/-7/14 days are bounded research scenarios; local "
                "cultivar suitability is unvalidated."
            ),
            (
                "Calendar effects use only the 1 m / 50% initial-water scenario; sensitivity "
                "results use the unshifted calendar."
            ),
            (
                "More crops can increase total deficit: compare per-crop stages and demand, "
                "not only the total or a single winner."
            ),
            (
                "Excess above capacity is unpartitioned outflow, not flooding, waterlogging, "
                "nitrate loss or irrigation demand."
            ),
            (
                "Water and surface depletion carry continuously across campaigns; no reset "
                "at planting. No effects of carbon, residues, pests or rotation on "
                "infiltration are modeled."
            ),
            (
                "Every episode is replayed, without selecting ENSO analogs or optimizing on "
                "its future weather."
            ),
        ],
    }
    (destination / "strategies.json").write_bytes(encode(manifest))
    return {
        "runs": len(runs),
        "rejected": len(rejected),
        "design_id": design_id,
        "soil_capacities_mm": [s["capacity_mm"] for s in soils],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--archive", type=Path, required=True)
    parser.add_argument("--runtime", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = run(json.loads(args.config.read_text()), args.archive, args.runtime, args.output)
    sys.stdout.write(json.dumps(result) + "\n")


if __name__ == "__main__":
    main()
