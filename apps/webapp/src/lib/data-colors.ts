import type { Lot } from "@cropilot/api"

// The only colors outside the theme: they encode data (crop, lot status, yield
// anomaly). They are declared here, once. MapLibre paint cannot read CSS
// variables, so these are literal values.

export const CROPS = {
  soybean: { label: "Soybean", color: "#22a06b" },
  maize: { label: "Maize", color: "#f5b100" },
  wheat: { label: "Wheat / winter cereal", color: "#d9653b" },
  sunflower: { label: "Sunflower", color: "#8e6bbf" },
  sorghum: { label: "Sorghum", color: "#8a5a44" },
  fallow: { label: "Fallow", color: "#cbd5e1" },
  other: { label: "Other or not identified", color: "#94a3b8" },
} as const

export type Crop = keyof typeof CROPS

export const CROP_IDS = Object.keys(CROPS) as Crop[]

/** Maps any crop label of the bundles ("Maize", "Wheat / second soybean", ...) to a palette entry. */
export function cropOf(label: string | null): Crop {
  const text = (label ?? "").toLowerCase()
  // A double crop such as "Wheat / second soybean" is told by its winter crop.
  if (
    text.includes("wheat") ||
    text.includes("trigo") ||
    text.includes("cereal")
  ) {
    return "wheat"
  }
  if (text.includes("soy") || text.includes("soja")) return "soybean"
  if (text.includes("maiz") || text.includes("corn")) return "maize"
  if (text.includes("sunflower") || text.includes("girasol")) return "sunflower"
  if (text.includes("sorghum") || text.includes("sorgo")) return "sorghum"
  if (text.includes("fallow") || text.includes("barbecho")) return "fallow"
  return "other"
}

export function cropColor(label: string | null): string {
  return CROPS[cropOf(label)].color
}

type LotStatus = NonNullable<Lot["status"]>

/** Outline of a lot on the map. Color and width say the same thing, so it reads without hue. */
export const LOT_STATUS = {
  ok: { label: "OK", color: "#0d1d32", width: 1 },
  watch: { label: "Watch", color: "#b7791f", width: 2.5 },
  alert: { label: "Alert", color: "#c0392b", width: 3 },
  check: { label: "Check", color: "#5b6b82", width: 2 },
  bare: { label: "Bare", color: "#94a3b8", width: 1.5 },
} as const satisfies Record<LotStatus, unknown>

export const LOT_STATUS_IDS = Object.keys(LOT_STATUS) as LotStatus[]

/** The theme's `--primary` and `--foreground`, for MapLibre paint. */
export const MAP_ACCENT_COLOR = "#314ec7"
export const MAP_INK_COLOR = "#0d1d32"

/**
 * Yield anomaly of one campaign: grey at zero, ink-red for losses and the accent for gains.
 * Saturation grows with the size of the anomaly, up to `limitPct`.
 */
const ANOMALY_LOSS_COLOR = "#c0392b"
const ANOMALY_GAIN_COLOR = "var(--primary)"
const ANOMALY_ZERO_COLOR = "#d6dbe4"

export function anomalyColor(anomalyPct: number, limitPct: number): string {
  const share = Math.min(Math.abs(anomalyPct) / limitPct, 1)
  const end = anomalyPct < 0 ? ANOMALY_LOSS_COLOR : ANOMALY_GAIN_COLOR
  return `color-mix(in oklab, ${end} ${Math.round(share * 100)}%, ${ANOMALY_ZERO_COLOR})`
}

/** One accent scale, light to strong, for a share between 0 and 1. */
export function accentScale(share: number): string {
  const clamped = Math.min(Math.max(share, 0), 1)
  return `color-mix(in oklab, var(--primary) ${Math.round(14 + clamped * 86)}%, var(--background))`
}
