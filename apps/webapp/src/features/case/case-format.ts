import type { BlockMeta, CampaignPoint } from "@cropilot/api"
import { getLocale, translate } from "@/lib/i18n"

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
  return `${sign}${formatDecimal(Math.abs(rounded), digits)}`
}

export function formatPercentSigned(value: number): string {
  return `${formatSigned(value, 0)}%`
}

function numberLocale(): string {
  return getLocale() === "es" ? "es-AR" : "en-US"
}

export function formatDecimal(value: number, digits = 2): string {
  const rounded = Number(value.toFixed(digits))
  return new Intl.NumberFormat(numberLocale(), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(rounded)
}

export function formatLotName(name: string): string {
  const match = /^(Lot|Field) (.+)$/.exec(name)
  return match
    ? translate(match[1] === "Lot" ? "Lot {id}" : "Field {id}", undefined, {
        id: match[2],
      })
    : name
}

export function formatWhole(value: number): string {
  return new Intl.NumberFormat(numberLocale(), {
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatUsdPerHa(value: number): string {
  return `${value < 0 ? "-" : ""}${formatWhole(Math.abs(value))} USD/ha`
}

export function formatMm(value: number): string {
  return `${formatWhole(value)} mm`
}

/** Root-zone soil wetness is a 0 to 1 index, not a percentage. */
export function formatWetness(value: number): string {
  return formatDecimal(value, 2)
}

/** Share of past campaigns that were drier, as the sentence a reader needs. */
export function formatWetterThan(percentile: number): string {
  if (percentile >= 1) return translate("Wetter than every past campaign")
  if (percentile <= 0) return translate("Drier than every past campaign")
  return translate("Wetter than {percent}% of past campaigns", undefined, {
    percent: Math.round(percentile * 100),
  })
}

export function formatShare(fraction: number): string {
  return `${Math.round(fraction * 100)}%`
}

export function pluralize(count: number, singular: string): string {
  return `${formatWhole(count)} ${translate(count === 1 ? singular : `${singular}s`)}`
}

/** "2022/23" from the year its campaign starts. */
export function campaignName(startYear: number): string {
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`
}

/** "31 August 2026" from an ISO date; any other text is shown as it came. */
export function formatDate(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Intl.DateTimeFormat(getLocale() === "es" ? "es-AR" : "en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${value}T00:00:00Z`))
    : value
}
