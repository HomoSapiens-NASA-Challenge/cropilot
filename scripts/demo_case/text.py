"""Sentences of the case: the five answers per strategy, limits, glossary and campaign notes.

Every sentence is written from the inputs (numbers) or from a cited source. Nothing here invents a
number: a figure that is not in the data or in a source is not in a sentence.
"""

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from common import (
    CURRENT_STRATEGY,
    PHASE_LABEL,
    STRATEGY_IDS,
    join_labels,
)
from market import ahead_and_behind

from app.modules.cases.schemas import (
    CampaignNote,
    CampaignPoint,
    Claim,
    GlossaryTerm,
    Limit,
    NotComputed,
    PairedCounts,
    RiskRow,
    StrategyAnswers,
)

MARKET_SOURCES = [
    "team_market_model",
    "magyp_yields",
    "magyp_margins",
    "a3_futures",
    "noaa_oni",
    "nasa_power",
]
WATER_SOURCES = ["team_water_scenarios", "nasa_power", "soilgrids"]
MAPPED_SOURCES = ["inta_crop_map", "ftw", "team_water_scenarios"]
COVER_COST_SOURCES = ["cover_crop_cost_producir", "cover_crop_cost_lanacion"]
PREVIOUS_CROP_SOURCES = ["previous_crop_uca", "previous_crop_core"]
# Cited cover-crop cost range (config.py of the market model): 60, 80 (used) and 86 USD/ha.
COVER_COST_USED, COVER_COST_LOW, COVER_COST_HIGH = 80, 60, 86

STRATEGY_LABELS = {
    "maize-soy-soy": ("Maize / soybean / soybean", ["Maize", "Soybean", "Soybean"]),
    "maize-soy": ("Maize / soybean", ["Maize", "Soybean"]),
    "wheat-soy2-maize-soy": (
        "Wheat + second soybean / maize / soybean",
        ["Wheat / second soybean", "Maize", "Soybean"],
    ),
    "continuous-soy": ("Continuous soybean", ["Soybean"]),
    "cover-soy": ("Cover crop + soybean", ["Winter cover crop", "Soybean"]),
}
AddNote = Callable[[str, str, str, list[str]], None]
HAS_MAIZE = {"maize-soy-soy", "maize-soy", "wheat-soy2-maize-soy"}
WATER_FOR_STRATEGY = {"maize-soy-soy", "maize-soy", "wheat-soy2-maize-soy"}


@dataclass
class ZoneFacts:
    """What the sentences of one zone are computed from."""

    zone_name: str
    has_reference_field: bool
    has_water: bool
    analog_campaigns: list[str]  # most similar first
    margins: dict[str, dict[str, float]]  # strategy -> campaign -> gross margin
    after_rent: dict[str, dict[str, float]]  # strategy -> campaign -> gross margin after rent
    risk: dict[str, RiskRow]
    water: dict[str, PairedCounts]  # strategy -> paired counts at the default start (1.0 m, 50%)

    @property
    def worst_campaign(self) -> str:
        """The analog campaign with the lowest average gross margin across the five strategies."""
        return min(
            self.analog_campaigns,
            key=lambda c: sum(self.margins[s][c] for s in STRATEGY_IDS),
        )


def usd(value: float) -> str:
    return f"{value:.0f}"


def _count(n: int, total: int, labels: list[str], noun: str = " analog campaigns") -> str:
    """'2 of 7 analog campaigns (1997/98 and 2004/05)'."""
    detail = f" ({join_labels(labels)})" if labels else ""
    return f"{n} of {total}{noun}{detail}"


def claim(text: str, source_ids: list[str]) -> Claim:
    return Claim(text=text, source_ids=source_ids)


# The five answers ------------------------------------------------------------------------------


def current_note(facts: ZoneFacts) -> str:
    if facts.has_reference_field:
        return (
            "Maize, soybean, soybean comes from the dominant INTA summer classes of 2021/22 to "
            "2023/24 at footprint 268949. It is a satellite reading, not confirmed by the farmer."
        )
    return (
        "Assumed for the zone: no field was mapped here, so this rotation is a reference point. "
        "Replace it with the farm's real rotation before reading the comparison."
    )


def _why(strategy: str, facts: ZoneFacts) -> list[Claim]:
    n = len(facts.analog_campaigns)
    margins = facts.margins[strategy]
    if strategy == "maize-soy-soy":
        return [
            claim(
                "Current rotation of the case: maize, soybean, soybean over three campaigns. "
                + (
                    "It follows the dominant INTA summer classes of 2021/22 to 2023/24 at "
                    "footprint 268949 and the farmer has not confirmed it."
                    if facts.has_reference_field
                    else "It is assumed for this zone; no field was mapped."
                ),
                MAPPED_SOURCES if facts.has_reference_field else [],
            ),
            claim(
                "The margin gives the cited previous-crop effect (+7%, up to +10% on soybean "
                "yield) only to the first soybean, the one that follows maize. The second soybean "
                "follows soybean and gets no effect.",
                [*PREVIOUS_CROP_SOURCES, "team_market_model"],
            ),
        ]
    if strategy == "maize-soy":
        return [
            claim(
                "Maize and soybean in turn. The soybean follows maize, so the margin includes the "
                "cited previous-crop effect on soybean yield (+7%, up to +10%).",
                [*PREVIOUS_CROP_SOURCES, "team_market_model"],
            )
        ]
    if strategy == "wheat-soy2-maize-soy":
        return [
            claim(
                "Three crops in three years: wheat followed by second soybean, then maize, then "
                "soybean. It is the rotation of thirds the consulted agronomist applies by "
                "default, and a crop covers the field in winter.",
                ["agronomist_interview"],
            )
        ]
    if strategy == "continuous-soy":
        leads = [c for c in facts.analog_campaigns if _leader(facts, c) == strategy]
        return [
            claim(
                "One crop every year, with a single cost structure. What the margins show: it has "
                f"the highest gross margin in {_count(len(leads), n, leads)}.",
                MARKET_SOURCES,
            )
        ]
    return [
        claim(
            "A winter cover crop (rye or vetch) before each first-crop soybean: the only "
            "soil-covering practice the market model prices. Cost "
            f"{COVER_COST_USED} USD/ha (range {COVER_COST_LOW} to {COVER_COST_HIGH}, cited), "
            "soybean yield effect set to 0.",
            [*COVER_COST_SOURCES, "cover_crop_yield_restovich"],
        ),
        claim(
            "Its gross margin is that of continuous soybean minus the cover-crop cost, in every "
            f"campaign (for example {usd(margins[facts.analog_campaigns[0]])} USD/ha in "
            f"{facts.analog_campaigns[0]}).",
            ["team_market_model"],
        ),
    ]


def _leader(facts: ZoneFacts, campaign: str) -> str:
    return max(STRATEGY_IDS, key=lambda s: (facts.margins[s][campaign], -STRATEGY_IDS.index(s)))


def _evidence(strategy: str, facts: ZoneFacts) -> list[Claim]:
    n = len(facts.analog_campaigns)
    own = facts.margins[strategy]
    current = facts.margins[CURRENT_STRATEGY]
    low, high = min(own, key=own.get), max(own, key=own.get)
    worst = facts.worst_campaign
    out = [
        claim(
            f"Gross margin in the {n} analog campaigns, own land, today's A3 futures: from "
            f"{usd(own[low])} USD/ha in {low} to {usd(own[high])} USD/ha in {high}.",
            MARKET_SOURCES,
        ),
        claim(
            f"Gross margin in the worst analog campaign ({worst}): {usd(own[worst])} USD/ha"
            + (
                f", against {usd(current[worst])} for the current rotation."
                if strategy != CURRENT_STRATEGY
                else "."
            ),
            MARKET_SOURCES,
        ),
    ]
    if strategy != CURRENT_STRATEGY:
        ahead, behind, tied = ahead_and_behind(own, current)
        tie_text = f"; tied in {len(tied)}" if tied else ""
        out.append(
            claim(
                "Against the current rotation: higher gross margin in "
                f"{_count(len(ahead), n, ahead)} and lower in "
                f"{_count(len(behind), n, behind, noun='')}{tie_text}.",
                MARKET_SOURCES,
            )
        )
    rent = facts.after_rent[strategy]
    negative = [c for c in facts.analog_campaigns if rent[c] < 0]
    out.append(
        claim(
            "On rented land the gross margin after rent is below zero in "
            f"{_count(len(negative), n, negative)}.",
            MARKET_SOURCES,
        )
    )
    risk = facts.risk[strategy]
    out.append(
        claim(
            f"Over {risk.n_scenarios} scenarios ({risk.n_yield_campaigns} analog campaigns x "
            f"{risk.n_price_campaigns} price campaigns): median {usd(risk.p50_usd_ha or 0)} "
            f"USD/ha, average of the worst 10% {usd(risk.cvar10_usd_ha or 0)} USD/ha, and the "
            f"gross margin does not cover the rent in {round((risk.share_below_rent or 0) * 100)}% "
            "of them. Small n: context, not a forecast.",
            MARKET_SOURCES,
        )
    )
    water = facts.water.get(strategy)
    if water is not None and strategy != CURRENT_STRATEGY:
        out.append(
            claim(
                "Modeled unmet crop water against the current rotation (1.0 m profile, 50% initial "
                f"water, {water.count} three-campaign episodes): lower in {water.lower_count}, "
                f"equal in {water.equal_count}, higher in {water.higher_count}; median "
                f"{water.median_mm:+.0f} mm.",
                WATER_SOURCES,
            )
        )
    return out


def _benefits(strategy: str, facts: ZoneFacts) -> list[Claim]:
    n = len(facts.analog_campaigns)
    out = []
    leads = [c for c in facts.analog_campaigns if _leader(facts, c) == strategy]
    if leads:
        out.append(
            claim(
                f"Highest gross margin of the five strategies in {_count(len(leads), n, leads)}.",
                MARKET_SOURCES,
            )
        )
    worst = facts.worst_campaign
    own, current = facts.margins[strategy][worst], facts.margins[CURRENT_STRATEGY][worst]
    if strategy != CURRENT_STRATEGY and own - current > 0.5:
        out.append(
            claim(
                f"Loses less than the current rotation in the worst analog campaign ({worst}): "
                f"{usd(own)} against {usd(current)} USD/ha.",
                MARKET_SOURCES,
            )
        )
    water = facts.water.get(strategy)
    if (
        water is not None
        and strategy != CURRENT_STRATEGY
        and water.lower_count > water.higher_count
    ):
        out.append(
            claim(
                "Less modeled unmet crop water than the current rotation in "
                f"{water.lower_count} of {water.count} three-campaign episodes (1.0 m, 50% initial "
                "water).",
                WATER_SOURCES,
            )
        )
    if strategy == "cover-soy":
        out.append(
            claim(
                "In the INTA Pergamino trial, soybean yield after cover crops did not differ from "
                "the no-cover control; the soil benefit is not computed here.",
                ["cover_crop_yield_restovich"],
            )
        )
    return out


def _missing(strategy: str, facts: ZoneFacts) -> list[Claim]:
    out = []
    if strategy == CURRENT_STRATEGY:
        out.append(
            claim(
                "The farm's real rotation is not confirmed: "
                + (
                    "the sequence is read from satellite crop classes."
                    if facts.has_reference_field
                    else "this case assumes it for the zone."
                ),
                ["inta_crop_map"] if facts.has_reference_field else [],
            )
        )
    out.append(
        claim(
            "Soil, weed and disease effects over several years are not in the margin, and no soil "
            "carbon, nitrogen or nitrate is computed.",
            ["team_market_model"],
        )
    )
    if strategy in HAS_MAIZE:
        out.append(
            claim(
                "Maize or wheat after soybean get no previous-crop yield effect in the margin: "
                "there is no verified local figure.",
                ["team_market_model"],
            )
        )
    if strategy == "cover-soy":
        out.append(
            claim(
                "The cover-crop cost is a cited scenario in nominal USD of 2012 and 2021, not a "
                "current itemised cost.",
                COVER_COST_SOURCES,
            )
        )
        out.append(
            claim(
                "The soybean yield effect of a cover crop is set to 0: the only local source, a "
                "trial at INTA Pergamino, reports no difference and gives no kg/ha table.",
                ["cover_crop_yield_restovich"],
            )
        )
    if not facts.has_water:
        out.append(claim("No water scenario was run for this zone.", []))
    elif strategy not in WATER_FOR_STRATEGY:
        out.append(claim("No water scenario was run for this strategy.", ["team_water_scenarios"]))
    else:
        out.append(
            claim(
                "The water scenarios cover one unvalidated 38 ha footprint with weather from a "
                "55 km NASA POWER cell, and they model unmet crop water, not yield.",
                WATER_SOURCES,
            )
        )
        if strategy == "maize-soy":
            out.append(
                claim(
                    "The water scenario for this strategy is maize, soybean, maize over three "
                    "campaigns: the same alternation, read over three campaigns.",
                    ["team_water_scenarios"],
                )
            )
        if strategy == "wheat-soy2-maize-soy":
            out.append(
                claim(
                    "The water scenario is the closest match, not an exact one: it runs maize, "
                    "then wheat with second soybean, then soybean, so its cycle starts at maize.",
                    ["team_water_scenarios"],
                )
            )
    return out


def _local_review(strategy: str) -> list[Claim]:
    sources = ["agronomist_interview"]
    crop = "maize and soybean" if strategy in HAS_MAIZE else "soybean"
    return [
        claim(
            "Water-table depth and low areas of the lot: waterlogging risk in a strong El Niño. No "
            "model here computes it.",
            sources,
        ),
        claim(
            "Water in the soil profile at sowing: the starting point of each campaign is what "
            "changes the decision.",
            sources,
        ),
        claim(
            f"Sowing date and cycle of {crop}: early or late sowing, short or long cycle.", sources
        ),
        claim(
            "Whether the lot's rotation and previous crop match this case: rotations come by "
            "default and are adjusted lot by lot with rain, profile water and water-table depth.",
            sources,
        ),
    ]


def strategy_answers(strategy: str, facts: ZoneFacts) -> StrategyAnswers:
    return StrategyAnswers(
        why=_why(strategy, facts),
        evidence=_evidence(strategy, facts),
        benefits=_benefits(strategy, facts),
        missing=_missing(strategy, facts),
        local_review=_local_review(strategy),
    )


# Block notes -----------------------------------------------------------------------------------


def risk_note(rows: list[RiskRow]) -> str:
    row = rows[0]
    return (
        f"Secondary, with small n. Each strategy is run over {row.n_yield_campaigns} analog "
        f"campaigns x {row.n_price_campaigns} price campaigns = {row.n_scenarios} scenarios. A "
        "price campaign is the ratio of the delivery-month to the planting-months settlement of "
        "the same A3 contract in a past year; only years where soybean, maize and wheat all have "
        "a ratio are used. This is not a distribution of the coming campaign: read the named "
        "analog campaigns first."
    )


def field_yield_reason(has_field_view: bool) -> str:
    """Why field-level yield is not computed; mentions the field view where the case has one."""
    text = (
        "Yields are department anomalies (MAGyP, or a NASA POWER model where MAGyP has none), not "
        "field measurements."
    )
    if has_field_view:
        text += (
            " The field view shows satellite greenness, which has not been checked against yields."
        )
    return text


def not_computed(has_water: bool, has_field_view: bool) -> list[NotComputed]:
    flooding = (
        "No team model computes it. The 'excess above capacity' of the water scenarios is outflow "
        "the soil profile could not hold, not flooding or waterlogging."
        if has_water
        else "No team model computes it for this zone."
    )
    field_yield = field_yield_reason(has_field_view)
    return [
        NotComputed(metric="Waterlogging and flooding", reason=flooding),
        NotComputed(
            metric="Soil carbon",
            reason="No soil carbon model has been run for any rotation of this case.",
        ),
        NotComputed(
            metric="Nitrogen and nitrate",
            reason="No nitrogen balance or nitrate loss is modeled; fertilizer enters the margin "
            "only as a MAGyP cost.",
        ),
        NotComputed(
            metric="Pest and disease cycles",
            reason="No model of pests, diseases or weeds under each rotation; the margin compares "
            "single campaigns.",
        ),
        NotComputed(metric="Field-level yield", reason=field_yield),
    ]


# Three of the market model's assumptions name things this case does not have (soil and carbon
# modules) or use Spanish crop names, so they are restated here. The build stops if the market
# text changes, so a stale rewrite can never ship.
ASSUMPTION_REWRITES = {
    "Yield = MAGyP regional model yield x (1 + observed department anomaly vs its linear trend in "
    "that campaign).": (
        "Yield = MAGyP regional model yield x (1 + the department's yield anomaly against its "
        "linear trend in that campaign; observed from MAGyP, or modeled from NASA POWER where "
        "MAGyP has no value)."
    ),
    "Previous-crop effect: only soja 1ra after maize, cited +7% (low) / +10% (high); other "
    "effects 0.": (
        "Previous-crop effect: only first-crop soybean after maize, cited +7% (used here) up to "
        "+10%; every other previous-crop effect is 0."
    ),
    "Cover crop: direct cost only (60/80/86 USD/ha, cited, old nominal USD), no extra rent; "
    "soybean yield effect 0 (INTA Pergamino trial found no difference). Soil benefits are "
    "reported by the soil and carbon modules.": (
        "Cover crop: direct cost only (60, 80 used, 86 USD/ha; cited, old nominal USD), no extra "
        "rent; soybean yield effect 0 (the INTA Pergamino trial found no difference). Soil "
        "benefits are not computed in this case."
    ),
}


def margin_assumptions(run: dict[str, Any]) -> list[str]:
    market_text = list(run["assumptions"])
    stale = [sentence for sentence in ASSUMPTION_REWRITES if sentence not in market_text]
    if stale:
        raise ValueError(f"The market assumptions changed; update the rewrites: {stale}")
    manifest = run["scenario_manifest"]
    costs, prices = manifest["costs"], manifest["prices"]
    contracts = ", ".join(
        f"{crop} {prices[key]['contract']}"
        for crop, key in (("soybean", "soja1"), ("maize", "maiz"), ("wheat", "trigo"))
    )
    date = prices["soja1"]["settlement_date"]
    return [
        *(ASSUMPTION_REWRITES.get(sentence, sentence) for sentence in market_text),
        f"Costs, rent and cost structure: MAGyP {costs['region'].title()} region, report "
        f"{costs['report']}.",
        f"Prices: A3 harvest-contract settlements of {date} ({contracts}); reference only, raw "
        "prices are not redistributed.",
    ]


# Limits ----------------------------------------------------------------------------------------


def limits(
    *,
    oni_now: float,
    highest_oni: float,
    highest_campaign: str,
    modeled_yield_values: int,
    yield_values: int,
    yield_skill: dict[str, float],
    has_water: bool,
    crop_map: Limit | None,
) -> list[Limit]:
    out = [
        Limit(
            title="Analog years are not a forecast",
            text=(
                "In a backtest over 307 campaigns in the 10 zones (target campaigns 1991/92 to "
                "2024/25, k = 7), picking analogs by ONI Jul-Sep and soil wetness predicted "
                "margins no better than the average of every earlier campaign: mean absolute "
                "error 123.2 against 122.3 USD/ha (-0.7%). It did beat k random campaigns "
                "(p = 0.007). The signal showed up in Marcos Juarez and Rio Cuarto only. Use the "
                "analogs as real named cases, not as a forecast."
            ),
            source_ids=["team_market_backtest"],
        ),
        Limit(
            title="No better rotation policy was found",
            text=(
                "Two team experiments looked for a rule that adapts the rotation year by year and "
                "found none. A tabular decision model (dynamic programming) earned -3 [-8; +3] "
                "USD/ha/year against the best fixed rotation (95% interval) and passed no "
                "criterion in 0 of 10 zones; Q-learning matched it in 85 to 100% of states. In the "
                "Pergamino lab the best policy gained +32 [12; 49] USD/ha/year against a "
                "pre-registered threshold of 56, and a one-step greedy rule equals the dynamic "
                "program. So no rotation is presented as the winner."
            ),
            source_ids=["team_rl_mdp", "team_rl_lab"],
        ),
        Limit(
            title="2026/27 is outside the historical range",
            text=(
                f"ONI Jul-Sep 2026 is {oni_now:+.2f}, above every candidate campaign (highest: "
                f"{highest_oni:+.2f} in {highest_campaign}). The analogs are the closest campaigns "
                "available, not equivalents, and a campaign this strong cannot be backtested."
            ),
            source_ids=["noaa_oni", "team_market_backtest"],
        ),
        Limit(
            title="ONI Jul-Sep is not strictly known on 31 August",
            text=(
                "NOAA publishes ONI Jul-Sep in early October, and the file used here holds revised "
                "values, not the ones published at the time. The strictly known alternative on 31 "
                "August is May-Jun-Jul."
            ),
            source_ids=["noaa_oni"],
        ),
        Limit(
            title="NASA POWER describes the zone, not the field",
            text=(
                "Each value covers a cell of about 55 km around the head town of the department. "
                "Root-zone soil wetness (GWETROOT) is a model estimate, not measured soil water."
            ),
            source_ids=["nasa_power"],
        ),
        Limit(
            title="Margins are scenarios",
            text=(
                "One campaign, today's A3 harvest futures and today's MAGyP costs, applied to the "
                "department yield anomaly of each past campaign. Multi-year effects of each "
                "rotation on soil, weeds and diseases are left out, and excess-water losses count "
                "only where they are already in the observed yields."
            ),
            source_ids=["team_market_model", "magyp_margins", "a3_futures", "magyp_yields"],
        ),
        Limit(
            title="Wheat does not respond to these signals",
            text=(
                "In the team's yield model, NASA POWER climate cuts the leave-one-year-out error "
                f"against the trend by {yield_skill['maíz']:.1f}% for maize and "
                f"{yield_skill['soja total']:.1f}% for soybean, but by "
                f"{yield_skill['trigo total']:.1f}% for wheat, which is nothing. The signals say "
                "little about the strategy with wheat."
            ),
            source_ids=["team_market_model"],
        ),
        Limit(
            title="Management has changed since the old campaigns",
            text=(
                "Defensive practices and forecasts have improved, so old campaigns resemble today "
                "less. Measuring each yield against its own trend corrects only part of it."
            ),
            source_ids=["agronomist_interview"],
        ),
    ]
    if modeled_yield_values:
        out.append(
            Limit(
                title="Some yield anomalies are modeled",
                text=(
                    f"{modeled_yield_values} of the {yield_values} maize and soybean yield "
                    "anomalies of this zone come from a NASA POWER climate model because MAGyP has "
                    "no value. Validated leaving one year out, it cuts the error against the "
                    f"trend by {yield_skill['soja total']:.1f}% for soybean and "
                    f"{yield_skill['maíz']:.1f}% for maize. Each campaign says which of the two it "
                    "is."
                ),
                source_ids=["team_market_model", "nasa_power"],
            )
        )
    if has_water:
        out.append(
            Limit(
                title="Water scenarios are not field validated",
                text=(
                    "The 1,170 runs are historical scenarios for one satellite footprint, released "
                    "as research only. The 39 three-campaign episodes overlap, so they are "
                    "descriptive comparisons, not independent trials or calibrated probabilities. "
                    "Excess above capacity is not flooding."
                ),
                source_ids=["team_water_scenarios"],
            )
        )
    if crop_map is not None:
        out.append(crop_map)
    return out


CROP_MAP_LIMIT_TITLE = "The crop map is not field truth"


def crop_map_limit(where: str, agreement: float, maize_f1: float, soybean_f1: float) -> Limit:
    """The crop map's agreement with INTA in one zone (`where`, e.g. "Pergamino")."""
    return Limit(
        title=CROP_MAP_LIMIT_TITLE,
        text=(
            f"The crop classifier agrees with INTA's national map {agreement:.2f} on average in "
            f"{where} (leave one campaign out; maize F1 {maize_f1:.2f}, soybean {soybean_f1:.2f}). "
            "That is agreement with another satellite product, and INTA's own map is about 0.89 "
            "accurate against field data. Field outlines are satellite estimates, unvalidated in "
            "Argentina, and vigor compares a field with its neighbours: it is not a yield."
        ),
        source_ids=["team_crop_map", "inta_crop_map", "ftw"],
    )


# Glossary --------------------------------------------------------------------------------------

GLOSSARY = [
    GlossaryTerm(
        term="NDVI",
        definition=(
            "Normalized Difference Vegetation Index, (near-infrared - red) / (near-infrared + "
            "red) from satellite reflectance. It has no unit; higher means greener, denser "
            "vegetation."
        ),
    ),
    GlossaryTerm(
        term="Root-zone soil wetness (GWETROOT)",
        definition=(
            "NASA POWER's modeled wetness of the root zone, a number from 0 to 1 with no unit. It "
            "is a model estimate for a cell of about 55 km, not millimetres of plant-available "
            "water and not a field measurement."
        ),
    ),
    GlossaryTerm(
        term="ONI",
        definition=(
            "Oceanic Nino Index: the three-month mean sea-surface temperature anomaly in the Nino "
            "3.4 region of the Pacific, from NOAA. This case uses the July-September value. At or "
            "above +0.5 is El Niño (+1.5 or more is called strong here), at or below -0.5 is La "
            "Niña."
        ),
    ),
    GlossaryTerm(
        term="Crop water deficit (unmet crop ET)",
        definition=(
            "Potential crop evapotranspiration minus the actual one in the daily water balance, in "
            "mm: the water the crop would have used if the soil had supplied it (FAO-56). It is "
            "not a yield loss."
        ),
    ),
    GlossaryTerm(
        term="Excess above capacity",
        definition=(
            "Water that exceeded what the modeled soil profile can hold and left it as drainage or "
            "runoff, in mm. It is not flooding or waterlogging."
        ),
    ),
    GlossaryTerm(
        term="Water balance",
        definition=(
            "Daily accounting of rain and evapotranspiration against the water a soil profile can "
            "store, following FAO-56. Here it is a bucket model run on NASA POWER weather."
        ),
    ),
    GlossaryTerm(
        term="Analog campaign",
        definition=(
            "A real past campaign, such as 1997/98, whose two signals (ONI Jul-Sep and soil "
            "wetness at the end of August) were among the closest to this year's. It is a named "
            "case, not a forecast."
        ),
    ),
    GlossaryTerm(
        term="Yield anomaly",
        definition=(
            "A department yield compared with its own linear trend over 1981-2024, in percent. "
            "Observed means it comes from MAGyP; modeled means MAGyP has no value and a NASA POWER "
            "climate model fills it."
        ),
    ),
    GlossaryTerm(
        term="Gross margin and gross margin after rent",
        definition=(
            "Gross margin is yield x price minus harvest and marketing costs and direct costs, in "
            "USD per hectare, following the MAGyP method. After rent also subtracts the regional "
            "rent per hectare, which matters on rented land."
        ),
    ),
]


# Campaign notes --------------------------------------------------------------------------------


def _label(point: CampaignPoint) -> str:
    return PHASE_LABEL[point.enso_phase]


def _wetness_text(points: list[CampaignPoint], point: CampaignPoint) -> str:
    """Soil wetness at the end of August, placed among the other candidate campaigns."""
    wetness = point.soil_wetness_end_aug
    if wetness is None:
        return "soil wetness not available"
    others = [
        p for p in points if p.campaign != point.campaign and p.soil_wetness_end_aug is not None
    ]
    drier = sum(1 for p in others if p.soil_wetness_end_aug < wetness)
    if drier == 0:
        place = f"the driest of the {len(points)} candidate campaigns"
    elif drier == len(others):
        place = f"the wettest of the {len(points)} candidate campaigns"
    elif drier >= len(others) / 2:
        place = f"wetter than {drier} of the other {len(others)} candidate campaigns"
    else:
        place = f"drier than {len(others) - drier} of the other {len(others)} candidate campaigns"
    return f"soil wetness at the end of August {wetness:.2f} ({place})"


def _yields_text(point: CampaignPoint) -> str:
    parts = []
    if point.maize_yield_anomaly_pct is not None:
        parts.append(f"maize {point.maize_yield_anomaly_pct:+.0f}%")
    if point.soybean_yield_anomaly_pct is not None:
        parts.append(f"soybean {point.soybean_yield_anomaly_pct:+.0f}%")
    provenance = {point.maize_yield_provenance, point.soybean_yield_provenance} - {"missing"}
    how = "/".join(sorted(provenance))
    return f"department yields against trend: {', '.join(parts)} ({how})"


def campaign_notes(
    zone_id: str,
    points: list[CampaignPoint],
    soybean_unharvested_pct: dict[int, float],
) -> dict[str, list[CampaignNote]]:
    """Notes derived from the data, plus the three curated notes that only exist for Pergamino."""
    notes: dict[str, list[CampaignNote]] = {}
    by_campaign = {point.campaign: point for point in points}
    first, last = points[0].campaign, points[-1].campaign

    def add(campaign: str, kind: str, text: str, sources: list[str]) -> None:
        notes.setdefault(campaign, []).append(
            CampaignNote.model_validate({"kind": kind, "text": text, "source_ids": sources})
        )

    strongest = max(points, key=lambda p: (p.oni_jas, -p.start_year))
    add(
        strongest.campaign,
        "strongest_start",
        f"Strongest El Niño signal in July to September among the candidate campaigns "
        f"({first} to {last}): ONI Jul-Sep {strongest.oni_jas:+.2f}.",
        ["noaa_oni"],
    )

    with_maize = [p for p in points if p.maize_yield_anomaly_pct is not None]
    worst = min(with_maize, key=lambda p: (p.maize_yield_anomaly_pct, p.start_year))
    modeled = worst.maize_yield_provenance == "modeled"
    add(
        worst.campaign,
        "worst_on_record",
        f"Worst maize yield on record at this department ({first} to {last}): "
        f"{abs(worst.maize_yield_anomaly_pct):.0f}% below its trend "
        f"({'modeled from NASA POWER' if modeled else 'observed, MAGyP'}). It started with an "
        f"ONI Jul-Sep of {worst.oni_jas:+.2f} ({_label(worst)} winter).",
        ["magyp_yields", "noaa_oni"] + (["nasa_power", "team_market_model"] if modeled else []),
    )

    overall = None
    if soybean_unharvested_pct:
        year = max(sorted(soybean_unharvested_pct), key=lambda y: soybean_unharvested_pct[y])
        pct = soybean_unharvested_pct[year]
        if pct > 0:
            overall = next(p for p in points if p.start_year == year)
            add(
                overall.campaign,
                "dated_event",
                f"Largest share of planted soybean not harvested at this department: {pct:.0f}% "
                "(MAGyP planted against harvested area; the cause is not recorded). It started "
                f"with ONI Jul-Sep {overall.oni_jas:+.2f} ({_label(overall)} winter).",
                ["magyp_yields", "noaa_oni"],
            )
    # 2026/27 starts as a strong El Niño: the worst soybean loss among the same kind of start.
    lost = soybean_unharvested_pct
    strong = [p for p in points if p.enso_phase == "strong_el_nino" and p.start_year in lost]
    if strong:
        worst_strong = max(strong, key=lambda p: (lost[p.start_year], -p.start_year))
        pct = lost[worst_strong.start_year]
        if pct > 0 and worst_strong is not overall:
            add(
                worst_strong.campaign,
                "dated_event",
                f"Largest share of planted soybean not harvested among the {len(strong)} strong "
                f"El Niño campaigns (ONI Jul-Sep at or above +1.5): {pct:.0f}% (MAGyP planted "
                "against harvested area; the cause is not recorded). "
                f"ONI Jul-Sep was {worst_strong.oni_jas:+.2f}.",
                ["magyp_yields", "noaa_oni"],
            )

    if zone_id == "pergamino":
        _pergamino_notes(by_campaign, points, add)
    return notes


def _pergamino_notes(
    by_campaign: dict[str, CampaignPoint], points: list[CampaignPoint], add: AddNote
) -> None:
    sources = ["team_rl_lab", "magyp_yields", "nasa_power", "noaa_oni", "agronomist_interview"]
    for campaign, extra in (
        ("2008/09", "2008 is a training year of that rule."),
        ("2022/23", "2022 is the only out-of-sample case of that rule."),
    ):
        point = by_campaign[campaign]
        add(
            campaign,
            "june_dry_soil_alert",
            "The team's June 1 dry-soil alert, computed from NASA POWER, fired in 2008 and 2022 "
            f"and missed 2011/12; {extra} This campaign started {_label(point)} (ONI Jul-Sep "
            f"{point.oni_jas:+.2f}) with {_wetness_text(points, point)}; {_yields_text(point)}. "
            "The consulted agronomist also names 2008 and 2023 as the worst episodes he "
            "remembers.",
            sources,
        )
    point = by_campaign["2017/18"]
    add(
        "2017/18",
        "counterexample",
        f"Counterexample: a {_label(point)} winter (ONI Jul-Sep {point.oni_jas:+.2f}) and "
        f"{_wetness_text(points, point)} still ended below trend ({_yields_text(point)}). Shown as "
        "a limit: the two signals do not rule out a bad campaign.",
        ["team_analog_approach", "magyp_yields", "nasa_power", "noaa_oni"],
    )
