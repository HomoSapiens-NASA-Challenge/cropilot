import type { LngLat } from "@/lib/geo"

// NASA POWER serves its meteorology and soil wetness (MERRA-2) on a
// 1/2° latitude × 5/8° longitude grid, centered on multiples of each step.
const POWER_LAT_STEP_DEG = 0.5
const POWER_LON_STEP_DEG = 0.625
const KM_PER_DEGREE = (2 * Math.PI * 6371.0088) / 360

export type PowerCell = {
  cellId: string
  center: LngLat
  south: number
  north: number
  west: number
  east: number
  widthKm: number
  heightKm: number
}

export function powerCellAt([lon, lat]: LngLat): PowerCell {
  const centerLat = Math.round(lat / POWER_LAT_STEP_DEG) * POWER_LAT_STEP_DEG
  const centerLon =
    Math.round((lon + 180) / POWER_LON_STEP_DEG) * POWER_LON_STEP_DEG - 180
  return {
    cellId: `${centerLat}:${centerLon}`,
    center: [centerLon, centerLat],
    south: centerLat - POWER_LAT_STEP_DEG / 2,
    north: centerLat + POWER_LAT_STEP_DEG / 2,
    west: centerLon - POWER_LON_STEP_DEG / 2,
    east: centerLon + POWER_LON_STEP_DEG / 2,
    widthKm:
      POWER_LON_STEP_DEG *
      KM_PER_DEGREE *
      Math.cos((centerLat * Math.PI) / 180),
    heightKm: POWER_LAT_STEP_DEG * KM_PER_DEGREE,
  }
}

/** Daily root-zone soil wetness and precipitation for one point, straight from the POWER API. */
export function powerDailySeriesUrl([lon, lat]: LngLat, year: number): string {
  const params = new URLSearchParams({
    parameters: "GWETROOT,PRECTOTCORR",
    community: "AG",
    longitude: lon.toFixed(4),
    latitude: lat.toFixed(4),
    start: `${year}0101`,
    end: `${year}1231`,
    format: "JSON",
  })
  return `https://power.larc.nasa.gov/api/temporal/daily/point?${params}`
}
