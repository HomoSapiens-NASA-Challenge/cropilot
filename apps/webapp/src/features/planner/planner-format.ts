import type { Itinerary, OutcomeValues } from "@cropilot/api"
import type {
  Action,
  EnsoPhase,
  PolicyKind,
} from "@/features/planner/planner-types"
import type { Crop } from "@/lib/data-colors"

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
  best_fixed: "Best fixed rotation",
  named: "Named strategy",
} as const satisfies Record<PolicyKind, string>

export const POLICY_KIND_ORDER = [
  "optimal",
  "agent",
  "best_fixed",
  "named",
] as const satisfies ReadonlyArray<PolicyKind>

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
  return `${ACTION_LABEL[itinerary.winter]}, then ${ACTION_LABEL[itinerary.summer]}`
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
  return `${formatOutcome(id, value)} ${OUTCOME_FORMAT[id].unit}`
}

export function formatOutcomeDelta(id: OutcomeId, value: number): string {
  return `${formatSigned(value, OUTCOME_FORMAT[id].digits)} ${OUTCOME_FORMAT[id].unit}`
}
