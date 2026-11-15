import type { ExpressionSpecification } from "maplibre-gl"

// Map paint needs literal colors: MapLibre does not read CSS variables.
export const CROPS = {
  soybean: { label: "Soybean", color: "#22a06b" },
  maize: { label: "Maize", color: "#f5b100" },
  wheatSoybean: { label: "Wheat / soybean", color: "#d9653b" },
} as const

export type Crop = keyof typeof CROPS

export const CROP_IDS = Object.keys(CROPS) as Crop[]

export const CROP_FILL_COLOR: ExpressionSpecification = [
  "match",
  ["get", "crop"],
  "soybean",
  CROPS.soybean.color,
  "maize",
  CROPS.maize.color,
  "wheatSoybean",
  CROPS.wheatSoybean.color,
  "#94a3b8",
]
