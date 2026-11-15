"""Build the public demo case (`case-v1`): `index.json` and one bundle per zone.

Run it with the backend environment, so it imports the contract and the water loader:

    uv run --directory cropilot/apps/backend python ../../scripts/demo_case/build.py \
        --hub-data /path/to/hub/data --out app/modules/cases/resources

Inputs (all under --hub-data, see README.md): `market_runs/<Zone>_2026.json` for the ten zones,
`raw/magyp.csv` (MAGyP estimates), `pergamino/` (the Pergamino package) and
`crop-map-prototype/fields.geojson`; the water scenarios are read from the backend data directory.
Every output is built as a contract object and serialized from it, so nothing invalid is written.
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import fieldblock as field_module
import market
import sources
import text
import unharvested
import water as water_module
from common import (
    CURRENT_STRATEGY,
    MARKET_ROTATION,
    PHASE_LABEL,
    STRATEGY_IDS,
    ZONE_IDS,
)

from app.modules.cases.schemas import (
    AnalogMargins,
    BlockMeta,
    CaseBundle,
    CaseIndex,
    CaseModules,
    Compare,
    Decision,
    FieldBlock,
    Strategy,
    WaterBlock,
    YearsLikeThis,
    ZoneCard,
)
from app.modules.regions.catalog import REGIONS
from app.modules.regions.schemas import Region
from app.modules.water.strategies import load_strategies, load_strategy_run

PERGAMINO = "pergamino"
RESOURCE_DIR = "app/modules/cases/resources"
DEFAULT_DEPTH_M, DEFAULT_FRACTION = 1.0, 0.5

WATER_META = BlockMeta(
    provenance="modeled",
    scale="field",
    unit="mm",
    source_ids=["team_water_scenarios", "nasa_power", "soilgrids", "inta_crop_map", "fao56"],
    note=(
        "Daily water balance (FAO-56 bucket) for one satellite-estimated footprint, with weather "
        "from the NASA POWER cell of Pergamino and SoilGrids soil. Each episode replays three "
        "campaigns from June of its start year; analog episodes carry per-crop detail."
    ),
)
LOTS_META = BlockMeta(
    provenance="modeled",
    scale="field",
    unit="NDVI (no unit)",
    source_ids=["nasa_hls", "inta_crop_map", "ftw", "team_crop_map"],
    note=(
        "The 2025/26 crop and the status come from the team's crop classifier on NASA HLS; the "
        "2020/21 to 2024/25 history is INTA's national crop map. Vigor compares a lot with the "
        "zone's fields of the same crop. Eighteen lots belong to a made-up farm; the other "
        "outlines of the zone carry no data."
    ),
)
REFERENCE_META = BlockMeta(
    provenance="modeled",
    scale="field",
    unit="NDVI (no unit)",
    source_ids=["ftw", "inta_crop_map", "nasa_hls", "soilgrids"],
    note=(
        "Outline: Fields of The World satellite estimate. Crop history: majority INTA class "
        "inside the outline. NDVI: NASA HLS mean of the valid pixels of each monthly scene. Soil "
        "capacity: SoilGrids retention at 0.6 and 1.0 m."
    ),
)
FIELD_LIMITATIONS = [
    "Outlines are satellite estimates (Fields of The World), not cadastral boundaries, and they "
    "are unvalidated in Argentina.",
    "The farm 'La Celina' is made up: the lot names and the farm are invented, the numbers are "
    "real measurements of real outlines.",
    "Only the 18 lots of the made-up farm carry a crop, status and NDVI curve; the other outlines "
    "of the zone are shown for context.",
    "The 2025/26 crop is a model estimate until INTA publishes its map; earlier campaigns use "
    "INTA's map directly.",
    "Vigor compares a lot with the zone's fields of the same crop under the same weather. It is "
    "not a yield estimate and has not been checked against yields.",
    "The reference footprint is not one of the lots: it is the 38 ha outline the water scenarios "
    "ran on, with no farmer attached.",
]


def region_by_id() -> dict[str, Region]:
    return {region.id: region for region in REGIONS}


def read_runs(hub_data: Path) -> dict[str, dict[str, Any]]:
    runs = {}
    for market_key in ZONE_IDS:
        path = hub_data / "market_runs" / f"{market_key}_2026.json"
        run = json.loads(path.read_text(encoding="utf-8"))
        market.check_schema(run)
        runs[market_key] = run
    return runs


def referenced_source_ids(value: object) -> set[str]:
    """Every `source_ids` entry anywhere in a dumped contract object."""
    found: set[str] = set()
    if isinstance(value, dict):
        for key, item in value.items():
            if key == "source_ids":
                found.update(item)
            else:
                found |= referenced_source_ids(item)
    elif isinstance(value, list):
        for item in value:
            found |= referenced_source_ids(item)
    return found


# Pergamino inputs --------------------------------------------------------------------------


class PergaminoInputs:
    """Everything that exists only for the reference zone: water scenarios and the field block."""

    def __init__(self, hub_data: Path, analog_campaigns: list[str]) -> None:
        bundle = load_strategies()
        self.water: WaterBlock = water_module.build_water_block(
            bundle, analog_campaigns, load_strategy_run, WATER_META
        )
        reference, _ = field_module.read_reference_field(
            hub_data / "pergamino", water_module.soil_capacities(bundle)
        )
        sequence = field_module.summer_sequence(
            reference.crop_history, ["2021/22", "2022/23", "2023/24"]
        )
        if sequence != ["Maize", "Soybean", "Soybean"]:
            raise ValueError(f"The mapped rotation changed: {sequence}; update the current note")
        lots, _ = field_module.read_lots(hub_data / "crop-map-prototype" / "fields.geojson")
        self.field = FieldBlock(
            farm_name="La Celina",
            farm_name_is_made_up=True,
            ndvi_months=field_module.NDVI_MONTHS,
            lots=lots,
            lots_meta=LOTS_META,
            reference_field=reference,
            reference_meta=REFERENCE_META,
            limitations=FIELD_LIMITATIONS,
        )


# One zone ----------------------------------------------------------------------------------


def zone_facts(
    region: Region,
    analog_margins: list[AnalogMargins],
    risk: list,
    water: WaterBlock | None,
    has_reference_field: bool,
) -> text.ZoneFacts:
    margins = {s: {} for s in STRATEGY_IDS}
    after_rent = {s: {} for s in STRATEGY_IDS}
    for row in analog_margins:
        for item in row.margins:
            margins[item.strategy_id][row.campaign] = item.gross_margin_usd_ha
            after_rent[item.strategy_id][row.campaign] = item.gross_margin_after_rent_usd_ha
    default_water = {}
    if water is not None:
        for counts in water.robustness:
            if (
                counts.depth_m == DEFAULT_DEPTH_M
                and counts.initial_water_fraction == DEFAULT_FRACTION
            ):
                default_water[counts.strategy_id] = counts
    return text.ZoneFacts(
        zone_name=region.name,
        has_reference_field=has_reference_field,
        has_water=water is not None,
        analog_campaigns=[row.campaign for row in analog_margins],
        margins=margins,
        after_rent=after_rent,
        risk={row.strategy_id: row for row in risk},
        water=default_water,
    )


def check_cover_cost(facts: text.ZoneFacts) -> None:
    """The sentences say the cover-crop margin is continuous soybean minus its cost, always."""
    for campaign in facts.analog_campaigns:
        gap = facts.margins["continuous-soy"][campaign] - facts.margins["cover-soy"][campaign]
        if abs(gap - text.COVER_COST_USED) > 0.05:
            raise ValueError(f"Cover-crop margin gap is {gap} in {campaign}, not the cited cost")


def strategies(facts: text.ZoneFacts) -> list[Strategy]:
    out = []
    for strategy_id in STRATEGY_IDS:
        label, sequence = text.STRATEGY_LABELS[strategy_id]
        water_strategy = {
            "maize-soy-soy": ("mapped-reference", "exact"),
            "maize-soy": ("summer-maize", "exact"),
            "wheat-soy2-maize-soy": ("winter-wheat", "closest"),
        }.get(strategy_id)
        has_water = facts.has_water and water_strategy is not None
        is_current = strategy_id == CURRENT_STRATEGY
        out.append(
            Strategy(
                strategy_id=strategy_id,
                label=label,
                sequence=sequence,
                is_current=is_current,
                current_note=text.current_note(facts) if is_current else None,
                market_rotation_id=MARKET_ROTATION[strategy_id],
                water_strategy_id=water_strategy[0] if has_water else None,
                water_match=water_strategy[1] if has_water else "none",
                answers=text.strategy_answers(strategy_id, facts),
            )
        )
    return out


def decision_description(current_oni: float, phase: str, wetness: float, percentile: float) -> str:
    return (
        f"End of August 2026. The two signals known then: ONI Jul-Sep {current_oni:+.2f} "
        f"({PHASE_LABEL[phase]}) and NASA POWER root-zone soil wetness {wetness:.2f} for 22-31 "
        f"August, higher than in {round(percentile * 100)}% of the past campaigns at this zone."
    )


def build_bundle(
    zone_id: str,
    run: dict[str, Any],
    region: Region,
    hub_data: Path,
    pergamino: PergaminoInputs | None,
    generated_utc: str,
) -> CaseBundle:
    has_water = pergamino is not None
    area = unharvested.read_area(hub_data / "raw" / "magyp.csv", region.province, region.department)
    phase_by_year = {
        row["start_year"]: market.phase_id(row["enso_phase_jas"]) for row in run["campaigns"]
    }
    unharvested_rows, pct_by_crop = unharvested.build_rows(area, phase_by_year)

    # Points first without notes to pick the notes, then again with them.
    bare_points = market.campaign_points(run, {})
    notes = text.campaign_notes(zone_id, bare_points, pct_by_crop["Soybean"])
    points = market.campaign_points(run, notes)
    current = market.current_campaign(run, points)

    margins = market.analog_margins(run)
    risk = market.risk_rows(run)
    facts = zone_facts(region, margins, risk, pergamino.water if pergamino else None, has_water)
    check_cover_cost(facts)
    if pergamino is not None:
        analog_ids = {row.scenario_id for row in margins}
        episode_ids = {e.scenario_id for e in pergamino.water.episodes if e.scenario_id}
        if not episode_ids <= analog_ids:
            raise ValueError("A water episode is tied to a campaign that is not an analog")

    modeled = sum(
        (point.maize_yield_provenance, point.soybean_yield_provenance).count("modeled")
        for point in points
    )
    evidence = run["evidence"]["yield_climate_model"]
    yield_skill = {crop: model["skill_vs_trend_pct"] for crop, model in evidence.items()}
    modules = CaseModules(
        years_like_this="available",
        margins="available",
        water="available" if has_water else "not_available",
        field="available" if has_water else "not_available",
    )
    years_like_this = YearsLikeThis(
        current=current,
        campaigns=points,
        method=market.analog_method(run),
        signals=BlockMeta(
            provenance="retrieved",
            scale="grid_cell",
            unit="ONI: degrees C anomaly; soil wetness: 0 to 1, no unit",
            source_ids=["noaa_oni", "nasa_power"],
            note=(
                "ONI Jul-Sep is one global index (NOAA, revised values). Soil wetness is the NASA "
                "POWER mean of 22-31 August at the department head town, a cell of about 55 km."
            ),
        ),
        yields=BlockMeta(
            provenance="observed",
            scale="department",
            unit="% against the department's linear trend, 1981-2024",
            source_ids=["magyp_yields", "nasa_power", "team_market_model"],
            note=(
                f"MAGyP department {region.department}, {region.province}. "
                f"{modeled} of {2 * len(points)} values are modeled from NASA POWER because MAGyP "
                "has none; each campaign gives the provenance of its two values."
                if modeled
                else f"MAGyP department {region.department}, {region.province}. Every value is "
                "observed by MAGyP."
            ),
        ),
        backtest=text.claim(
            "Backtest of this method (307 campaigns, 10 zones, k = 7): analogs chosen by ONI "
            "Jul-Sep plus soil wetness predicted the margin no better than averaging all earlier "
            "campaigns (mean absolute error 123.2 against 122.3 USD/ha), and better than k random "
            "campaigns (p = 0.007). The analogs are real named cases, not a forecast.",
            ["team_market_backtest"],
        ),
    )
    compare = Compare(
        strategies=strategies(facts),
        margins_meta=BlockMeta(
            provenance="scenario",
            scale="department",
            unit="USD/ha per campaign",
            source_ids=text.MARKET_SOURCES,
            note=(
                "Gross margin of one campaign on own land: department yield of each analog "
                "campaign, today's A3 harvest futures and today's MAGyP regional costs. A "
                "scenario, not a forecast."
            ),
        ),
        margin_assumptions=text.margin_assumptions(run),
        analog_margins=margins,
        ranking_changes=market.ranking_changes(run),
        risk_summary=risk,
        risk_note=text.risk_note(risk),
        unharvested=unharvested_rows,
        unharvested_meta=BlockMeta(
            provenance="observed",
            scale="department",
            unit="% of planted area not harvested",
            source_ids=["magyp_yields", "noaa_oni"],
            note=(
                f"MAGyP planted against harvested area, campaigns {points[0].campaign} to "
                f"{points[-1].campaign} grouped by the ONI Jul-Sep phase. Soybean is MAGyP "
                "'soja total'. Campaigns with no planted area are skipped; the cause of the "
                "loss is not recorded."
            ),
        ),
        water=pergamino.water if pergamino else None,
        not_computed=text.not_computed(has_water, has_water),
    )
    limits = text.limits(
        oni_now=current.oni_jas,
        highest_oni=current.highest_past_oni_jas,
        highest_campaign=current.highest_past_oni_campaign,
        modeled_yield_values=modeled,
        yield_values=2 * len(points),
        yield_skill=yield_skill,
        has_water=has_water,
        has_reference_field=has_water,
    )
    field_block = pergamino.field if pergamino else None
    cited = referenced_source_ids(
        [
            years_like_this.model_dump(),
            compare.model_dump(),
            field_block.model_dump() if field_block else None,
            [limit.model_dump() for limit in limits],
        ]
    )
    return CaseBundle(
        schema_version="case-v1",
        zone_id=zone_id,
        zone_name=region.name,
        province=region.province,
        generated_utc=generated_utc,
        decision=Decision(
            campaign=current.campaign,
            decision_date=current.decision_date,
            description=decision_description(
                current.oni_jas,
                current.enso_phase,
                current.soil_wetness_end_aug,
                current.soil_wetness_percentile,
            ),
        ),
        modules=modules,
        years_like_this=years_like_this,
        compare=compare,
        field=field_block,
        limits=limits,
        glossary=text.GLOSSARY,
        sources=sources.select(cited),
    )


# Index -------------------------------------------------------------------------------------


def build_index(bundles: list[CaseBundle], regions: dict[str, Region]) -> CaseIndex:
    first = bundles[0].years_like_this.current
    cards = []
    for bundle in bundles:
        current = bundle.years_like_this.current
        if (current.oni_jas, current.highest_past_oni_jas, current.highest_past_oni_campaign) != (
            first.oni_jas,
            first.highest_past_oni_jas,
            first.highest_past_oni_campaign,
        ):
            raise ValueError(f"The ONI signal differs in {bundle.zone_id}; it is one global index")
        region = regions[bundle.zone_id]
        cards.append(
            ZoneCard(
                zone_id=bundle.zone_id,
                name=region.name,
                province=region.province,
                latitude_deg=region.latitude_deg,
                longitude_deg=region.longitude_deg,
                soil_wetness_end_aug=current.soil_wetness_end_aug,
                soil_wetness_percentile=current.soil_wetness_percentile,
                analogs=[
                    point.campaign
                    for point in sorted(
                        (p for p in bundle.years_like_this.campaigns if p.is_analog),
                        key=lambda p: p.analog_rank or 0,
                    )
                ],
                modules=bundle.modules,
            )
        )
    meta = BlockMeta(
        provenance="retrieved",
        scale="grid_cell",
        unit="ONI: degrees C anomaly; soil wetness: 0 to 1, no unit",
        source_ids=["noaa_oni", "nasa_power", "team_market_model"],
        note=(
            "ONI Jul-Sep 2026 is the value in the NOAA file; soil wetness is the NASA POWER mean "
            "of 22-31 August 2026 at each zone's point, and its percentile compares it with the "
            "same window of the past campaigns of that zone."
        ),
    )
    return CaseIndex(
        schema_version="case-v1",
        campaign=first.campaign,
        decision_date=first.decision_date,
        oni_jas=first.oni_jas,
        enso_phase=first.enso_phase,
        highest_past_oni_jas=first.highest_past_oni_jas,
        highest_past_oni_campaign=first.highest_past_oni_campaign,
        zones=cards,
        meta=meta,
        sources=sources.select(set(meta.source_ids)),
    )


def write(path: Path, model: CaseBundle | CaseIndex) -> None:
    """Serialize from the object and check the written text validates as the same contract type."""
    payload = model.model_dump_json()
    type(model).model_validate_json(payload)
    path.write_text(payload + "\n", encoding="utf-8")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--hub-data", type=Path, required=True)
    parser.add_argument("--out", type=Path, default=Path(RESOURCE_DIR))
    parser.add_argument(
        "--generated-utc", help="default: the latest `generated_utc` of the market runs"
    )
    args = parser.parse_args(argv)

    regions = region_by_id()
    runs = read_runs(args.hub_data)
    generated_utc = args.generated_utc or max(run["generated_utc"] for run in runs.values())
    pergamino_run = runs["Pergamino"]
    analog_campaigns = [
        row["campaign"] for row in sorted(pergamino_run["analog_years"], key=lambda r: r["rank"])
    ]
    pergamino = PergaminoInputs(args.hub_data, analog_campaigns)

    args.out.mkdir(parents=True, exist_ok=True)
    bundles = []
    for market_key, zone_id in ZONE_IDS.items():
        bundle = build_bundle(
            zone_id,
            runs[market_key],
            regions[zone_id],
            args.hub_data,
            pergamino if zone_id == PERGAMINO else None,
            generated_utc,
        )
        write(args.out / f"{zone_id}.json", bundle)
        bundles.append(bundle)
        size_kb = (args.out / f"{zone_id}.json").stat().st_size / 1024
        sys.stdout.write(f"{zone_id}: {size_kb:.0f} KB\n")
    write(args.out / "index.json", build_index(bundles, regions))
    sys.stdout.write(f"index.json: {len(bundles)} zones, generated {generated_utc}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
