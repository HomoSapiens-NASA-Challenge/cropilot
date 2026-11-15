import type { CaseBundle, CaseIndex } from "@cropilot/api"

// The full bundle is up to 800 KB (daily water episodes, field outlines); a voice
// turn cannot carry it. These views keep only what the agent may quote, every
// number still next to its source ids, and drop nothing it would need to cite.

function sourceList(bundle: Pick<CaseBundle, "sources">) {
  return bundle.sources.map(({ id, dataset, provider, period, location }) => ({
    id,
    dataset,
    provider,
    period,
    location,
  }))
}

/** How the campaign started in every zone, for comparing zones. */
export function nationalBriefing(index: CaseIndex) {
  return {
    campaign: index.campaign,
    decision_date: index.decision_date,
    oni_jas: index.oni_jas,
    enso_phase: index.enso_phase,
    highest_past_oni_jas: index.highest_past_oni_jas,
    highest_past_oni_campaign: index.highest_past_oni_campaign,
    zones: index.zones,
    meta: index.meta,
    sources: sourceList(index),
  }
}

/** One zone's case without the per-strategy explanations and the heavy series. */
export function caseBriefing(bundle: CaseBundle) {
  const { years_like_this: years, compare } = bundle
  return {
    zone_id: bundle.zone_id,
    zone_name: bundle.zone_name,
    province: bundle.province,
    decision: bundle.decision,
    modules: bundle.modules,
    current_campaign: years.current,
    analog_method: years.method,
    analog_backtest: years.backtest,
    analog_campaigns: years.campaigns.filter((campaign) => campaign.is_analog),
    strategies: compare.strategies.map(
      ({ strategy_id, label, sequence, is_current, current_note }) => ({
        strategy_id,
        label,
        sequence,
        is_current,
        current_note,
      })
    ),
    margins_meta: compare.margins_meta,
    margin_assumptions: compare.margin_assumptions,
    analog_margins: compare.analog_margins,
    risk_summary: compare.risk_summary,
    risk_note: compare.risk_note,
    not_computed: compare.not_computed,
    limits: bundle.limits,
    sources: sourceList(bundle),
  }
}

/** Why one strategy is what it is, or null when the zone has no such strategy. */
export function strategyDetails(bundle: CaseBundle, strategyId: string) {
  const strategy = bundle.compare.strategies.find(
    (candidate) => candidate.strategy_id === strategyId
  )
  if (!strategy) return null
  return {
    strategy_id: strategy.strategy_id,
    label: strategy.label,
    water_match: strategy.water_match,
    answers: strategy.answers,
    ranking_changes: bundle.compare.ranking_changes.filter(
      (change) =>
        change.strategy_a === strategyId || change.strategy_b === strategyId
    ),
    risk: bundle.compare.risk_summary.find(
      (row) => row.strategy_id === strategyId
    ),
    sources: sourceList(bundle),
  }
}
