import type { BlockMeta, CampaignPoint } from "@cropilot/api"

export type Provenance = BlockMeta["provenance"]
export type SpatialScale = BlockMeta["scale"]
export type EnsoPhase = CampaignPoint["enso_phase"]

export const ENSO_PHASE_LABEL = {
  strong_el_nino: "Strong El Niño",
  el_nino: "El Niño",
  neutral: "Neutral",
  la_nina: "La Niña",
} as const satisfies Record<EnsoPhase, string>

export const PROVENANCE = {
  observed: {
    label: "Observed",
    description: "Measured or recorded in the real world.",
  },
  retrieved: {
    label: "Retrieved",
    description: "Read from a public dataset as it is published.",
  },
  modeled: {
    label: "Modeled",
    description: "Computed by a model. It was not observed.",
  },
  scenario: {
    label: "Scenario",
    description: "A what-if run under stated assumptions.",
  },
  missing: {
    label: "Missing",
    description: "No value exists. It is shown as missing, never as zero.",
  },
} as const satisfies Record<Provenance, { label: string; description: string }>

export const SCALE_LABEL = {
  global: "Global signal",
  grid_cell: "NASA POWER cell, not this field",
  department: "Department, not this field",
  field: "This field",
} as const satisfies Record<SpatialScale, string>

/** A number with its sign always visible: `+2.16`, `-0.40`. */
export function formatSigned(value: number, digits = 2): string {
  const rounded = Number(value.toFixed(digits))
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : ""
  return `${sign}${Math.abs(rounded).toFixed(digits)}`
}

export function formatPercentSigned(value: number): string {
  return `${formatSigned(value, 0)}%`
}

const WHOLE_NUMBER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
})

export function formatWhole(value: number): string {
  return WHOLE_NUMBER.format(value)
}

export function formatUsdPerHa(value: number): string {
  return `${value < 0 ? "-" : ""}${WHOLE_NUMBER.format(Math.abs(value))} USD/ha`
}

export function formatMm(value: number): string {
  return `${WHOLE_NUMBER.format(value)} mm`
}

/** Root-zone soil wetness is a 0 to 1 index, not a percentage. */
export function formatWetness(value: number): string {
  return value.toFixed(2)
}

/** Share of past campaigns that were drier, as the sentence a reader needs. */
export function formatWetterThan(percentile: number): string {
  if (percentile >= 1) return "Wetter than every past campaign"
  if (percentile <= 0) return "Drier than every past campaign"
  return `Wetter than ${Math.round(percentile * 100)}% of past campaigns`
}

export function formatShare(fraction: number): string {
  return `${Math.round(fraction * 100)}%`
}

export function pluralize(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`
}

/** "2022/23" from the year its campaign starts. */
export function campaignName(startYear: number): string {
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`
}

const LONG_DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

/** "31 August 2026" from an ISO date; any other text is shown as it came. */
export function formatDate(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? LONG_DATE.format(new Date(`${value}T00:00:00Z`))
    : value
}
