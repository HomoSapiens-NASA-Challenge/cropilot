import type { Lot } from "@cropilot/api"
import { SVG_COLORS } from "@/lib/theme"

export const CROPS = {
  soybean: { label: "Soybean", color: SVG_COLORS.soybean },
  maize: { label: "Maize", color: SVG_COLORS.maize },
  wheat: { label: "Wheat / winter cereal", color: SVG_COLORS.wheatSoybean },
  sunflower: { label: "Sunflower", color: SVG_COLORS.sunflower },
  sorghum: { label: "Sorghum", color: SVG_COLORS.sorghum },
  fallow: { label: "Fallow", color: SVG_COLORS.fallow },
  other: { label: "Other or not identified", color: SVG_COLORS.otherCrop },
} as const

export type Crop = keyof typeof CROPS

export function cropOf(label: string | null): Crop {
  const text = (label ?? "").toLowerCase()
  if (
    text.includes("wheat") ||
    text.includes("trigo") ||
    text.includes("cereal")
  )
    return "wheat"
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

export const LOT_STATUS = {
  ok: { label: "OK", color: SVG_COLORS.lotOk, width: 1 },
  watch: { label: "Watch", color: SVG_COLORS.lotWatch, width: 2.5 },
  alert: { label: "Alert", color: SVG_COLORS.lotAlert, width: 3 },
  check: { label: "Check", color: SVG_COLORS.lotCheck, width: 2 },
  bare: { label: "Bare", color: SVG_COLORS.otherCrop, width: 1.5 },
} as const satisfies Record<LotStatus, unknown>

export const LOT_STATUS_IDS = [
  "ok",
  "watch",
  "alert",
  "check",
  "bare",
] as const satisfies readonly LotStatus[]
