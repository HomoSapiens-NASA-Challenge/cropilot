import type {
  EnsoReading,
  Itinerary,
  OutcomeValues,
  PlannerSource,
} from "@cropilot/api"
import type {
  Action,
  Conclusion,
  EnsoPhase,
  PolicyKind,
} from "@/features/planner/planner-types"
import type { Crop } from "@/lib/data-colors"
import { getLocale, translate } from "@/lib/i18n"

export const ACTION_LABEL = {
  fallow: "Fallow",
  wheat: "Wheat",
  soybean_first: "First-crop soybean",
  soybean_second: "Second-crop soybean",
  maize: "Maize",
} as const satisfies Record<Action, string>

/** Marks inside a colored cell, so a crop is told without its hue. */
export const ACTION_SHORT = {
  fallow: "F",
  wheat: "W",
  soybean_first: "S1",
  soybean_second: "S2",
  maize: "M",
} as const satisfies Record<Action, string>

export const ACTION_CROP = {
  fallow: "fallow",
  wheat: "wheat",
  soybean_first: "soybean",
  soybean_second: "soybean",
  maize: "maize",
} as const satisfies Record<Action, Crop>

export const ACTION_ORDER = [
  "fallow",
  "wheat",
  "soybean_first",
  "soybean_second",
  "maize",
] as const satisfies ReadonlyArray<Action>

export const ENSO_LABEL = {
  la_nina: "La Niña",
  neutral: "Neutral",
  el_nino: "El Niño",
} as const satisfies Record<EnsoPhase, string>

export const ENSO_ORDER = [
  "la_nina",
  "neutral",
  "el_nino",
] as const satisfies ReadonlyArray<EnsoPhase>

export const POLICY_KIND_LABEL = {
  optimal: "Exact optimum",
  agent: "Learning agent",
  myopic: "One campaign at a time",
  best_fixed: "Best fixed rotation",
  margin_only: "Margin only",
  named: "Named strategy",
} as const satisfies Record<PolicyKind, string>

export const POLICY_KIND_ORDER = [
  "optimal",
  "agent",
  "myopic",
  "best_fixed",
  "margin_only",
  "named",
] as const satisfies ReadonlyArray<PolicyKind>

/** The held-out conclusion of the optimum against one baseline, as a word. */
export const CONCLUSION_LABEL = {
  better: "Better",
  worse: "Worse",
  inconclusive: "Inconclusive",
  identical: "Identical",
} as const satisfies Record<Conclusion, string>

const ENSO_SEASON_LABEL = {
  FMA: "Feb-Apr",
  JAS: "Jul-Sep",
} as const satisfies Record<EnsoReading["season"], string>

/** `NOAA ONI Feb-Apr 2026: +0.11 (Neutral)`, the reading a default phase comes from. */
export function describeEnsoReading(reading: EnsoReading): string {
  return translate("NOAA ONI {value1} {value2}: {value3} ({value4})", {
    value1: translate(ENSO_SEASON_LABEL[reading.season]),
    value2: reading.year,
    value3: formatSigned(reading.oni),
    value4: translate(ENSO_LABEL[reading.phase]),
  })
}

/** The sources a card draws on, picked from the run's own list by id. */
export function sourcesById(
  sources: ReadonlyArray<PlannerSource>,
  ids: ReadonlyArray<string>
): PlannerSource[] {
  return sources.filter((source) => ids.includes(source.source_id))
}

const WHOLE_NUMBER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
})

export function formatWhole(value: number): string {
  return WHOLE_NUMBER.format(value)
}

/** A number with its sign always visible: `+2.16`, `-0.40`. */
export function formatSigned(value: number, digits = 2): string {
  const rounded = Number(value.toFixed(digits))
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : ""
  return `${sign}${Math.abs(rounded).toFixed(digits)}`
}

/** Scores are unitless; two decimals tell policies apart without suggesting precision. */
export function formatScore(value: number): string {
  return formatSigned(value, 2)
}

export function formatShare(fraction: number): string {
  return `${Math.round(fraction * 100)}%`
}

/** An interval as plain words: `-0.31 to +0.10`. */
export function formatInterval(low: number, high: number): string {
  return translate("{value1} to {value2}", {
    value1: formatScore(low),
    value2: formatScore(high),
  })
}

/** Measured wall time: milliseconds below a second, one decimal of seconds above. */
export function formatDuration(milliseconds: number): string {
  return milliseconds < 1000
    ? `${milliseconds} ms`
    : `${(milliseconds / 1000).toFixed(1)} s`
}

/** "2022/23" from the year its campaign starts. */
export function campaignName(startYear: number): string {
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`
}

/** "22/23", for tight columns. */
export function campaignShortName(startYear: number): string {
  return `${String(startYear % 100).padStart(2, "0")}/${String((startYear + 1) % 100).padStart(2, "0")}`
}

export function itineraryLabel(itinerary: Itinerary): string {
  return translate("{value1}, then {value2}", {
    value1: translate(ACTION_LABEL[itinerary.winter]),
    value2: translate(ACTION_LABEL[itinerary.summer]),
  })
}

type OutcomeId = keyof OutcomeValues

const OUTCOME_FORMAT = {
  margin_usd_ha: { digits: 0, unit: "USD/ha" },
  deficit_mm: { digits: 0, unit: "mm" },
  bare_days: { digits: 1, unit: "days" },
  bare_rain_mm: { digits: 0, unit: "mm" },
  drainage_mm: { digits: 0, unit: "mm" },
} as const satisfies Record<OutcomeId, { digits: number; unit: string }>

/** An outcome in its own unit, without the unit: `412`, `31.5`. */
export function formatOutcome(id: OutcomeId, value: number): string {
  return value.toFixed(OUTCOME_FORMAT[id].digits)
}

export function formatOutcomeWithUnit(id: OutcomeId, value: number): string {
  return `${formatOutcome(id, value)} ${translate(OUTCOME_FORMAT[id].unit)}`
}

export function formatOutcomeDelta(id: OutcomeId, value: number): string {
  return `${formatSigned(value, OUTCOME_FORMAT[id].digits)} ${translate(OUTCOME_FORMAT[id].unit)}`
}

export function formatPlannerList(values: string[]): string {
  return new Intl.ListFormat(getLocale(), {
    style: "long",
    type: "conjunction",
  }).format(values)
}
