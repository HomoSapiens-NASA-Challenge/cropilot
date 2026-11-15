import { SVG_COLORS } from "@/lib/theme"

export const CROPS = {
  soybean: {
    label: "Soybean",
    swatchClassName: "bg-chart-3",
    fill: SVG_COLORS.soybean,
  },
  // The web's #f5b100 fails the chart lightness check; mobile matches the crop-history charts.
  maize: {
    label: "Maize",
    swatchClassName: "bg-chart-2",
    fill: SVG_COLORS.maize,
  },
  wheatSoybean: {
    label: "Wheat / soybean",
    swatchClassName: "bg-chart-wheat-soybean",
    fill: SVG_COLORS.wheatSoybean,
  },
} as const

export type Crop = keyof typeof CROPS
export const CROP_IDS: ReadonlyArray<Crop> = [
  "soybean",
  "maize",
  "wheatSoybean",
]
