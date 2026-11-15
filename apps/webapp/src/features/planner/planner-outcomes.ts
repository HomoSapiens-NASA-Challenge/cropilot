import type { OutcomeValues, PriorityWeights } from "@cropilot/api"

type OutcomeId = keyof OutcomeValues

type OutcomeDefinition = {
  id: OutcomeId
  label: string
  /** For tight spaces such as the share bars of a preset. */
  shortLabel: string
  unit: string
  /** What a better campaign looks like for this outcome. */
  direction: "up" | "down"
  hint: string
}

/** The five simulator outcomes the agronomist weighs, in the order of the sliders. */
export const OUTCOMES = [
  {
    id: "margin_usd_ha",
    shortLabel: "Margin",
    label: "Gross margin",
    unit: "USD/ha",
    direction: "up",
    hint: "Counts up: more margin is better.",
  },
  {
    id: "deficit_mm",
    shortLabel: "Water deficit",
    label: "Crop water deficit",
    unit: "mm",
    direction: "down",
    hint: "Counts down: water the crop needed and did not get.",
  },
  {
    id: "bare_days",
    shortLabel: "Bare soil days",
    label: "Days of bare soil",
    unit: "days",
    direction: "down",
    hint: "Counts down: days with no crop or residue cover.",
  },
  {
    id: "bare_rain_mm",
    shortLabel: "Rain on bare soil",
    label: "Rain on bare soil",
    unit: "mm",
    direction: "down",
    hint: "Counts down: erosion exposure.",
  },
  {
    id: "drainage_mm",
    shortLabel: "Drainage",
    label: "Drainage below the root zone",
    unit: "mm",
    direction: "down",
    hint: "Counts down: water lost below the roots.",
  },
] as const satisfies ReadonlyArray<OutcomeDefinition>

export const OUTCOME_LABEL = Object.fromEntries(
  OUTCOMES.map((outcome) => [outcome.id, outcome.label])
) as Record<OutcomeId, string>

export type PresetId =
  | "margin_first"
  | "protect_soil"
  | "save_water"
  | "balanced"

export const PRESETS: ReadonlyArray<{
  id: PresetId
  label: string
  description: string
  weights: PriorityWeights
}> = [
  {
    id: "margin_first",
    label: "Margin first",
    description: "Gross margin only. The other four outcomes carry no weight.",
    weights: {
      margin_usd_ha: 1,
      deficit_mm: 0,
      bare_days: 0,
      bare_rain_mm: 0,
      drainage_mm: 0,
    },
  },
  {
    id: "protect_soil",
    label: "Protect the soil",
    description:
      "Mostly margin, with weight on keeping the soil covered: fewer bare days and less rain on bare soil.",
    weights: {
      margin_usd_ha: 0.4,
      deficit_mm: 0,
      bare_days: 0.3,
      bare_rain_mm: 0.3,
      drainage_mm: 0,
    },
  },
  {
    id: "save_water",
    label: "Save water",
    description: "Half margin, half avoiding crop water deficit.",
    weights: {
      margin_usd_ha: 0.5,
      deficit_mm: 0.5,
      bare_days: 0,
      bare_rain_mm: 0,
      drainage_mm: 0,
    },
  },
  {
    id: "balanced",
    label: "Balanced",
    description:
      "Margin first, with the other four outcomes sharing the rest equally.",
    weights: {
      margin_usd_ha: 0.4,
      deficit_mm: 0.15,
      bare_days: 0.15,
      bare_rain_mm: 0.15,
      drainage_mm: 0.15,
    },
  },
]

export const DEFAULT_PRESET = PRESETS[0]

export function totalWeight(weights: PriorityWeights): number {
  return OUTCOMES.reduce((sum, outcome) => sum + weights[outcome.id], 0)
}

/** Each outcome's share of the total weight, 0 to 1. All zero when nothing has weight. */
export function weightShares(
  weights: PriorityWeights
): Record<OutcomeId, number> {
  const total = totalWeight(weights)
  return Object.fromEntries(
    OUTCOMES.map((outcome) => [
      outcome.id,
      total > 0 ? weights[outcome.id] / total : 0,
    ])
  ) as Record<OutcomeId, number>
}

export const HORIZONS = [
  { campaigns: 1, description: "Each campaign is planned on its own." },
  { campaigns: 2, description: "Each decision also counts the next campaign." },
  {
    campaigns: 3,
    description: "Each decision also counts the next two campaigns.",
  },
  {
    campaigns: 4,
    description: "Each decision also counts the next three campaigns.",
  },
  {
    campaigns: 5,
    description: "Each decision also counts the next four campaigns.",
  },
] as const

export function presetOf(weights: PriorityWeights): PresetId | null {
  const match = PRESETS.find((preset) =>
    OUTCOMES.every(
      (outcome) =>
        Math.abs(preset.weights[outcome.id] - weights[outcome.id]) < 1e-9
    )
  )
  return match?.id ?? null
}
