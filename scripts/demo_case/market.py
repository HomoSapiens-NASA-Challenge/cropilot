"""Maps one market run (`dashboard-draft-1` JSON of the market model) onto the `case-v1` blocks."""

from typing import Any

from common import (
    BUNDLE_STRATEGY,
    MARKET_ROTATION,
    PHASE_ID,
    STRATEGY_IDS,
    TIE_USD_HA,
)

from app.modules.cases.schemas import (
    AnalogMargins,
    AnalogMethod,
    CampaignNote,
    CampaignPoint,
    CurrentCampaign,
    RankingChange,
    RiskRow,
    StrategyMargin,
)

Run = dict[str, Any]


def phase_id(label: str) -> str:
    """'strong El Niño' -> 'strong_el_nino'. An unknown label stops the build."""
    return PHASE_ID[label]


def check_schema(run: Run) -> None:
    if run["schema_version"] != "dashboard-draft-1":
        raise ValueError(f"Unexpected market run schema: {run['schema_version']}")
    if run["status"] != "ready":
        raise ValueError(f"The market run is not ready: {run['status']}")


def campaign_points(run: Run, notes: dict[str, list[CampaignNote]]) -> list[CampaignPoint]:
    """One point per candidate campaign, with the notes the builder attached to it."""
    points = []
    for row in run["campaigns"]:
        points.append(
            CampaignPoint(
                campaign=row["campaign"],
                start_year=row["start_year"],
                scenario_id=row["scenario_id"],
                oni_jas=row["oni_jas"],
                enso_phase=phase_id(row["enso_phase_jas"]),
                soil_wetness_end_aug=row["gwetroot_end_aug"],
                maize_yield_anomaly_pct=row["maize_yield_anomaly_pct"],
                maize_yield_provenance=row["maize_yield_provenance"],
                soybean_yield_anomaly_pct=row["soybean_yield_anomaly_pct"],
                soybean_yield_provenance=row["soybean_yield_provenance"],
                is_analog=row["is_analog"],
                analog_rank=row["analog_rank"],
                analog_distance=row["analog_distance"],
                notes=notes.get(row["campaign"], []),
            )
        )
    return points


def highest_past_oni(points: list[CampaignPoint]) -> tuple[float, str]:
    """The highest ONI Jul-Sep among the candidates and its campaign (the earliest on a tie)."""
    best = max(points, key=lambda point: (point.oni_jas, -point.start_year))
    return best.oni_jas, best.campaign


def current_campaign(run: Run, points: list[CampaignPoint]) -> CurrentCampaign:
    decision = run["scenario_manifest"]["decision"]
    highest, highest_campaign = highest_past_oni(points)
    return CurrentCampaign(
        campaign=decision["campaign"],
        decision_date=decision["decision_date"],
        oni_jas=decision["oni_jas"],
        enso_phase=phase_id(decision["enso_phase_jas"]),
        soil_wetness_end_aug=decision["gwetroot_end_aug"],
        soil_wetness_percentile=decision["gwetroot_percentile_vs_past"],
        highest_past_oni_jas=highest,
        highest_past_oni_campaign=highest_campaign,
        outside_historical_range=decision["oni_jas"] > highest,
    )


def analog_method(run: Run) -> AnalogMethod:
    method = run["scenario_manifest"]["analog_method"]
    return AnalogMethod(
        k=method["k"],
        features=method["features"],
        distance=method["distance"],
        candidates=method["candidates"],
        phase_rule=method["phase_rule"],
    )


def leading_strategy(margins: dict[str, float]) -> str:
    """The strategy with the highest gross margin; the first in display order wins an exact tie."""
    return max(
        STRATEGY_IDS, key=lambda strategy: (margins[strategy], -STRATEGY_IDS.index(strategy))
    )


def analog_margins(run: Run) -> list[AnalogMargins]:
    """Gross margin of each bundle strategy in each analog campaign, most similar first."""
    leaders = {
        row["campaign"]: row["leading_strategy"]
        for row in run["comparison"]["leader_by_campaign"]
        if row["metric_id"] == "gross_margin_usd_ha"
    }
    out = []
    for row in sorted(run["analog_years"], key=lambda item: item["rank"]):
        gross = {
            strategy: row["gross_margin_usd_ha"][rotation]
            for strategy, rotation in MARKET_ROTATION.items()
        }
        after_rent = {
            strategy: row["gross_margin_after_rent_usd_ha"][rotation]
            for strategy, rotation in MARKET_ROTATION.items()
        }
        leader = leading_strategy(gross)
        # The market pipeline also ranks the two-year wheat/maize rotation, which is not a bundle
        # strategy. When it leads, the bundle leader is recomputed; otherwise both must agree.
        market_leader = BUNDLE_STRATEGY.get(leaders[row["campaign"]])
        if market_leader is not None and market_leader != leader:
            raise ValueError(f"Leader mismatch in {row['campaign']}: {market_leader} vs {leader}")
        out.append(
            AnalogMargins(
                scenario_id=row["scenario_id"],
                campaign=row["campaign"],
                analog_rank=row["rank"],
                leading_strategy_id=leader,
                margins=[
                    StrategyMargin(
                        strategy_id=strategy,
                        gross_margin_usd_ha=gross[strategy],
                        gross_margin_after_rent_usd_ha=after_rent[strategy],
                    )
                    for strategy in STRATEGY_IDS
                ],
            )
        )
    return out


def _campaign_of(scenario_id: str) -> str:
    return scenario_id.removeprefix("analog:")


def ranking_changes(run: Run) -> list[RankingChange]:
    """Where the order of two bundle strategies flips, with campaign labels and bundle ids.

    Each pair is written once, in display order, so `a` is the strategy listed first.
    """
    metrics = {
        "gross_margin_usd_ha": "gross_margin",
        "gross_margin_after_rent_usd_ha": "gross_margin_after_rent",
    }
    out = []
    for row in run["comparison"]["ranking_changes"]:
        a, b = BUNDLE_STRATEGY.get(row["strategy_a"]), BUNDLE_STRATEGY.get(row["strategy_b"])
        if a is None or b is None:
            continue
        a_ahead = [_campaign_of(item) for item in row["a_ahead_in"]]
        b_ahead = [_campaign_of(item) for item in row["b_ahead_in"]]
        if STRATEGY_IDS.index(a) > STRATEGY_IDS.index(b):
            a, b, a_ahead, b_ahead = b, a, b_ahead, a_ahead
        out.append(
            RankingChange(
                metric=metrics[row["metric_id"]],
                strategy_a=a,
                strategy_b=b,
                a_ahead_in=a_ahead,
                b_ahead_in=b_ahead,
                order_inverts=row["order_inverts"],
            )
        )
    order = {metric: index for index, metric in enumerate(metrics.values())}
    out.sort(
        key=lambda item: (
            order[item.metric],
            STRATEGY_IDS.index(item.strategy_a),
            STRATEGY_IDS.index(item.strategy_b),
        )
    )
    return out


def risk_rows(run: Run) -> list[RiskRow]:
    """Secondary statistics of the ensemble that crosses analog campaigns with price campaigns."""
    out = []
    by_rotation = {
        row["rotation"]: row
        for row in run["secondary_risk_summary"]["rows"]
        if row["ensemble"] == "analog_campaigns"
    }
    for strategy in STRATEGY_IDS:
        row = by_rotation[MARKET_ROTATION[strategy]]
        out.append(
            RiskRow(
                strategy_id=strategy,
                n_yield_campaigns=row["n_yield_campaigns"],
                n_price_campaigns=row["n_price_campaigns"],
                n_scenarios=row["n_scenarios"],
                p10_usd_ha=row["gm_p10_usd_ha"],
                p50_usd_ha=row["gm_p50_usd_ha"],
                p90_usd_ha=row["gm_p90_usd_ha"],
                cvar10_usd_ha=row["cvar10_gm_usd_ha"],
                share_below_rent=row["p_gm_below_rent"],
                share_below_zero=row["p_gm_below_0"],
            )
        )
    return out


def ahead_and_behind(
    margins: dict[str, float], reference: dict[str, float]
) -> tuple[list[str], list[str], list[str]]:
    """Campaigns where `margins` is above, below or tied with `reference` (0.5 USD/ha tie band)."""
    ahead = [c for c in margins if margins[c] - reference[c] > TIE_USD_HA]
    behind = [c for c in margins if margins[c] - reference[c] < -TIE_USD_HA]
    tied = [c for c in margins if c not in ahead and c not in behind]
    return ahead, behind, tied
