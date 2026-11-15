import type { LngLat } from "@/features/farm-map/geometry"

const hectares = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 })
const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 0,
})

export function formatHectares(areaHa: number): string {
  return `${hectares.format(areaHa)} ha`
}

export function formatShare(fraction: number): string {
  return percent.format(fraction)
}

export function formatLngLat([lon, lat]: LngLat): string {
  const latLabel = `${Math.abs(lat).toFixed(4)}° ${lat < 0 ? "S" : "N"}`
  const lonLabel = `${Math.abs(lon).toFixed(4)}° ${lon < 0 ? "W" : "E"}`
  return `${latLabel}, ${lonLabel}`
}
