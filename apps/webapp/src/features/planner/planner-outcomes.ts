import type { OutcomeValues, PriorityWeights } from "@cropilot/api"

type OutcomeId = keyof OutcomeValues

type OutcomeDefinition = {
  id: OutcomeId
  label: string
  unit: string
  /** What a better campaign looks like for this outcome. */
  direction: "up" | "down"
  hint: string
}

/** The five simulator outcomes the agronomist weighs, in the order of the sliders. */
export const OUTCOMES = [
  {
    id: "margin_usd_ha",
    label: "Gross margin",
    unit: "USD/ha",
    direction: "up",
    hint: "Counts up: more margin is better.",
  },
  {
    id: "deficit_mm",
    label: "Crop water deficit",
    unit: "mm",
    direction: "down",
    hint: "Counts down: water the crop needed and did not get.",
  },
  {
    id: "bare_days",
    label: "Days of bare soil",
    unit: "days",
    direction: "down",
    hint: "Counts down: days with no crop or residue cover.",
  },
  {
    id: "bare_rain_mm",
    label: "Rain on bare soil",
    unit: "mm",
    direction: "down",
    hint: "Counts down: erosion exposure.",
  },
  {
    id: "drainage_mm",
    label: "Drainage below the root zone",
    unit: "mm",
    direction: "down",
    hint: "Counts down: water lost below the roots.",
  },
] as const satisfies ReadonlyArray<OutcomeDefinition>

export const OUTCOME_LABEL = Object.fromEntries(
  OUTCOMES.map((outcome) => [outcome.id, outcome.label])
) as Record<OutcomeId, string>

type PresetId = "margin_first" | "protect_soil" | "save_water" | "balanced"

export const PRESETS: ReadonlyArray<{
  id: PresetId
  label: string
  weights: PriorityWeights
}> = [
  {
    id: "margin_first",
    label: "Margin first",
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

export function presetOf(weights: PriorityWeights): PresetId | null {
  const match = PRESETS.find((preset) =>
    OUTCOMES.every(
      (outcome) =>
        Math.abs(preset.weights[outcome.id] - weights[outcome.id]) < 1e-9
    )
  )
  return match?.id ?? null
}
