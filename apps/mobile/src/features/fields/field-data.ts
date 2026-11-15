// Local adapter over the verified Pergamino handoff snapshot in assets/map-data.
// Replace these reads with an agreed API contract later; keep field IDs as text
// and never turn a missing value into zero.
import comparisonJson from "../../../assets/map-data/comparison.json"
import cropHistoryJson from "../../../assets/map-data/crop-history.json"
import fieldsJson from "../../../assets/map-data/fields.json"
import soilProfileJson from "../../../assets/map-data/soil-profile.json"
import studyAreasJson from "../../../assets/map-data/study-areas.json"
import surfaceWaterJson from "../../../assets/map-data/surface-water.json"
import vegetationJson from "../../../assets/map-data/vegetation.json"

export type FieldSummary = {
  id: string
  label: string
  areaHa: number
  boundaryDate: string
  boundaryMethod: string
  /** FTW model confidence; not the probability that the boundary is exact. */
  confidence0to100: number
  farmerConfirmed: boolean
  cadastralBoundary: boolean
  isDemoField: boolean
  hasSoilProfile: boolean
}

export const STUDY_AREA = (() => {
  const feature = studyAreasJson.features[0]
  if (!feature) {
    throw new Error("study-areas.json has no study window")
  }
  return {
    name: feature.properties.name,
    role: feature.properties.geometry_role,
    footprintCount: feature.properties.available_local_footprints,
  }
})()

export const FIELDS: FieldSummary[] = fieldsJson.features.map((feature) => ({
  id: feature.properties.source_id,
  label: feature.properties.label,
  areaHa: feature.properties.geodesic_area_ha,
  boundaryDate: feature.properties.source_datetime.slice(0, 10),
  boundaryMethod: feature.properties.source_method,
  confidence0to100: feature.properties.source_confidence_0_100,
  farmerConfirmed: feature.properties.farmer_confirmed,
  cadastralBoundary: feature.properties.cadastral_boundary,
  isDemoField: feature.properties.demo_selected,
  hasSoilProfile: feature.properties.local_diagnostics.soil_profile,
}))

export function findField(fieldId: string): FieldSummary | undefined {
  return FIELDS.find((field) => field.id === fieldId)
}

// --- Crop history (INTA national crop maps) ---------------------------------

export type CropCategory =
  | "winter-cereal"
  | "maize"
  | "soybean"
  | "fallow"
  | "other"
  | "no-data"

export type CropClassShare = {
  labelOriginal: string
  category: CropCategory
  fractionOfField: number
}

export type CropMapSeason = {
  mapId: string
  season: string
  sourceUrl: string
  classes: CropClassShare[]
}

export type CropCampaign = {
  campaign: string
  seasons: CropMapSeason[]
}

function cropCategory(labelOriginal: string): CropCategory {
  const label = labelOriginal.toLowerCase()
  if (label.startsWith("cereales de invierno")) return "winter-cereal"
  if (label.startsWith("maiz") || label.startsWith("maíz")) return "maize"
  // "CI-Soja" is a winter cereal followed by soybean; the label keeps that nuance.
  if (label.includes("soja")) return "soybean"
  if (label.startsWith("barbecho")) return "fallow"
  return "other"
}

const SEASON_ORDER = ["annual", "winter", "summer"]

export function getCropHistory(fieldId: string): CropCampaign[] {
  const field = cropHistoryJson.fields.find((item) => item.field_id === fieldId)
  if (!field) {
    return []
  }
  const campaigns = new Map<string, CropMapSeason[]>()
  for (const map of field.maps) {
    const classes: CropClassShare[] = map.class_histogram.map((entry) => ({
      labelOriginal: entry.label_original,
      category: cropCategory(entry.label_original),
      fractionOfField: entry.fraction_of_field_pixels,
    }))
    const noDataFraction =
      map.fractions_of_field_pixels.source_mask +
      map.fractions_of_field_pixels.transparent_fill +
      map.fractions_of_field_pixels.unknown_code +
      map.fractions_of_field_pixels.missing
    if (noDataFraction > 0) {
      classes.push({
        labelOriginal: "No mapped class",
        category: "no-data",
        fractionOfField: noDataFraction,
      })
    }
    classes.sort((a, b) => b.fractionOfField - a.fractionOfField)
    const seasons = campaigns.get(map.campaign) ?? []
    seasons.push({
      mapId: map.map_id,
      season: map.season,
      sourceUrl: map.source_url,
      classes,
    })
    campaigns.set(map.campaign, seasons)
  }
  return [...campaigns.entries()].map(([campaign, seasons]) => ({
    campaign,
    seasons: seasons.sort(
      (a, b) => SEASON_ORDER.indexOf(a.season) - SEASON_ORDER.indexOf(b.season)
    ),
  }))
}

export const CROP_HISTORY_LIMITATIONS = cropHistoryJson.limitations

// --- Vegetation (NASA HLS NDVI) ----------------------------------------------

export type NdviSample = {
  month: string
  acquiredUtc: string
  sceneId: string
  /** Mean NDVI over valid pixels; null when the scene had no valid pixel. */
  ndviMean: number | null
  validFraction: number
  validPixelCount: number
  fieldPixelCount: number
}

export function getNdviSeries(fieldId: string): NdviSample[] {
  return vegetationJson.records
    .filter((record) => record.field_id === fieldId)
    .map((record) => ({
      month: record.month,
      acquiredUtc: record.acquired_utc,
      sceneId: record.scene_id,
      ndviMean: record.ndvi_mean,
      validFraction: record.valid_ndvi_fraction,
      validPixelCount: record.valid_ndvi_pixel_count,
      fieldPixelCount: record.field_pixel_count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

export const NDVI_LIMITATIONS = vegetationJson.limitations

// --- Soil (SoilGrids, modeled point) -----------------------------------------

export type SoilValue = {
  mean: number
  low: number | null
  high: number | null
}

export type SoilProperty = {
  property: string
  name: string
  unit: string
  /** One value per depth, in the order of SOIL_DEPTHS. */
  byDepth: (SoilValue | null)[]
}

export const SOIL_DEPTHS = [
  "0-5cm",
  "5-15cm",
  "15-30cm",
  "30-60cm",
  "60-100cm",
  "100-200cm",
]

const SOIL_PROPERTIES: { property: string; name: string }[] = [
  { property: "clay", name: "Clay" },
  { property: "silt", name: "Silt" },
  { property: "sand", name: "Sand" },
  { property: "soc", name: "Organic carbon" },
  { property: "phh2o", name: "pH (water)" },
]

export type SoilProfile = {
  latitude: number
  longitude: number
  scope: string
  spatialSupport: string
  properties: SoilProperty[]
}

/** SoilGrids was queried at one point inside 268949 only; other fields get null. */
export function getSoilProfile(fieldId: string): SoilProfile | null {
  if (soilProfileJson.mapped_field_id !== fieldId) {
    return null
  }
  const rows = soilProfileJson.rows
  const valueFor = (property: string, depth: string, statistic: string) =>
    rows.find(
      (row) =>
        row.property === property &&
        row.depth_label === depth &&
        row.statistic === statistic
    )
  return {
    latitude: soilProfileJson.latitude,
    longitude: soilProfileJson.longitude,
    scope: soilProfileJson.scope,
    spatialSupport: rows[0]?.spatial_support ?? soilProfileJson.scope,
    properties: SOIL_PROPERTIES.map(({ property, name }) => {
      const unitRow = rows.find((row) => row.property === property)
      if (!unitRow) {
        throw new Error(`soil-profile.json has no rows for ${property}`)
      }
      return {
        property,
        name,
        unit: unitRow.unit,
        byDepth: SOIL_DEPTHS.map((depth) => {
          const mean = valueFor(property, depth, "mean")
          if (!mean) return null
          return {
            mean: mean.value,
            low: valueFor(property, depth, "Q0.05")?.value ?? null,
            high: valueFor(property, depth, "Q0.95")?.value ?? null,
          }
        }),
      }
    }),
  }
}

// --- Surface water (NASA OPERA DSWx) -----------------------------------------

export type SurfaceWaterStatus = {
  requestedMonths: number
  notDownloadedMonths: number
  maskedOrFillMonths: number
  /** Months with at least one valid pixel over this field. */
  usableMonths: number
  catalogStart: string
  catalogEnd: string
}

export function getSurfaceWaterStatus(fieldId: string): SurfaceWaterStatus {
  const records = surfaceWaterJson.records.filter(
    (record) => record.field_id === fieldId
  )
  const [catalogStart = "", catalogEnd = ""] =
    surfaceWaterJson.manifest.catalog_period
  return {
    requestedMonths: records.length,
    notDownloadedMonths: records.filter(
      (record) => record.status === "not_downloaded"
    ).length,
    maskedOrFillMonths: records.filter(
      (record) => record.status === "all_masked_or_fill"
    ).length,
    usableMonths: records.filter(
      (record) =>
        record.valid_pixel_count !== null && record.valid_pixel_count > 0
    ).length,
    catalogStart: catalogStart.slice(0, 10),
    catalogEnd: catalogEnd.slice(0, 10),
  }
}

// --- Rotation comparison -------------------------------------------------------

export const COMPARISON = {
  isAvailable: comparisonJson.status !== "missing",
  currentRotationConfirmed: comparisonJson.current_rotation_confirmed,
  reason: comparisonJson.reason,
}
