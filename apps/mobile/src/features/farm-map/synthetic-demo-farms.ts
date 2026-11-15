import type { FeatureCollection, Polygon } from "geojson"
import type { Crop } from "@/features/farm-map/crops"
import {
  type LngLat,
  rectangleCorners,
  ringAreaHa,
  ringBounds,
  ringCenter,
  splitIntoGrid,
} from "@/features/farm-map/geometry"

// SYNTHETIC DEMO DATA. Boundaries, names, rotations and crops are made up to
// show the viewer; they are not real parcels. Areas are computed from these
// made-up boundaries. Farms will come from the API once they carry geometry.

type SyntheticFarmSpec = {
  farmId: string
  name: string
  rotation: string
  center: LngLat
  widthM: number
  heightM: number
  rotationDeg: number
  columns: number
  rows: number
  lotCrops: ReadonlyArray<Crop>
}

const SYNTHETIC_FARM_SPECS: ReadonlyArray<SyntheticFarmSpec> = [
  {
    farmId: "demo-north",
    name: "Demo farm North",
    rotation: "Soybean → Maize → Wheat / soybean",
    center: [-60.6, -33.78],
    widthM: 2400,
    heightM: 1600,
    rotationDeg: 8,
    columns: 3,
    rows: 2,
    lotCrops: [
      "soybean",
      "maize",
      "wheatSoybean",
      "maize",
      "soybean",
      "soybean",
    ],
  },
  {
    farmId: "demo-east",
    name: "Demo farm East",
    rotation: "Maize → Soybean",
    center: [-60.4, -33.92],
    widthM: 2000,
    heightM: 2000,
    rotationDeg: -12,
    columns: 2,
    rows: 2,
    lotCrops: ["maize", "soybean", "soybean", "maize"],
  },
  {
    farmId: "demo-south",
    name: "Demo farm South",
    rotation: "Continuous soybean",
    center: [-60.58, -34.02],
    widthM: 3200,
    heightM: 1200,
    rotationDeg: 20,
    columns: 4,
    rows: 1,
    lotCrops: ["soybean", "soybean", "soybean", "soybean"],
  },
  {
    farmId: "demo-west",
    name: "Demo farm West",
    rotation: "Wheat / soybean → Maize",
    center: [-60.76, -33.9],
    widthM: 1800,
    heightM: 2400,
    rotationDeg: 0,
    columns: 2,
    rows: 3,
    lotCrops: [
      "wheatSoybean",
      "maize",
      "maize",
      "wheatSoybean",
      "wheatSoybean",
      "maize",
    ],
  },
]

export type DemoLot = {
  lotId: string
  farmId: string
  name: string
  crop: Crop
  areaHa: number
  ring: LngLat[]
}

export type DemoFarm = {
  farmId: string
  name: string
  rotation: string
  areaHa: number
  center: LngLat
  bounds: [LngLat, LngLat]
  ring: LngLat[]
  lots: DemoLot[]
}

function buildFarm(spec: SyntheticFarmSpec): DemoFarm {
  const lotCount = spec.columns * spec.rows
  if (spec.lotCrops.length !== lotCount) {
    throw new Error(
      `${spec.farmId}: ${spec.lotCrops.length} crops for ${lotCount} lots`
    )
  }

  const corners = rectangleCorners(spec)
  const ring = [
    corners.northWest,
    corners.southWest,
    corners.southEast,
    corners.northEast,
    corners.northWest,
  ]
  // Differs from the web copy only here and in geometry.ts: mobile type-checks
  // with noUncheckedIndexedAccess, so indexed reads need an explicit guard.
  const lots = splitIntoGrid(corners, spec.columns, spec.rows).map(
    (lotRing, index): DemoLot => {
      const crop = spec.lotCrops[index]
      if (crop === undefined) {
        throw new Error(`${spec.farmId}: no crop for lot ${index + 1}`)
      }
      return {
        lotId: `${spec.farmId}-lot-${index + 1}`,
        farmId: spec.farmId,
        name: `Lot ${index + 1}`,
        crop,
        areaHa: ringAreaHa(lotRing),
        ring: lotRing,
      }
    }
  )

  return {
    farmId: spec.farmId,
    name: spec.name,
    rotation: spec.rotation,
    areaHa: ringAreaHa(ring),
    center: ringCenter(ring),
    bounds: ringBounds([ring]),
    ring,
    lots,
  }
}

export const SYNTHETIC_DEMO_FARMS: ReadonlyArray<DemoFarm> =
  SYNTHETIC_FARM_SPECS.map(buildFarm)

export const SYNTHETIC_DEMO_BOUNDS = ringBounds(
  SYNTHETIC_DEMO_FARMS.map((farm) => farm.ring)
)

export type CropShare = { crop: Crop; areaHa: number; share: number }

/** Area per crop across the farm's lots, largest first. */
export function cropMix(farm: DemoFarm): CropShare[] {
  const areaByCrop = new Map<Crop, number>()
  for (const lot of farm.lots) {
    areaByCrop.set(lot.crop, (areaByCrop.get(lot.crop) ?? 0) + lot.areaHa)
  }
  const totalHa = farm.lots.reduce((total, lot) => total + lot.areaHa, 0)
  return [...areaByCrop]
    .map(([crop, areaHa]) => ({ crop, areaHa, share: areaHa / totalHa }))
    .sort((left, right) => right.areaHa - left.areaHa)
}

export const SYNTHETIC_DEMO_LOTS_BY_ID = new Map(
  SYNTHETIC_DEMO_FARMS.flatMap((farm) => farm.lots).map((lot) => [
    lot.lotId,
    lot,
  ])
)

export type LotFeatureProperties = { lotId: string; farmId: string; crop: Crop }

export const SYNTHETIC_DEMO_LOTS_GEOJSON: FeatureCollection<
  Polygon,
  LotFeatureProperties
> = {
  type: "FeatureCollection",
  features: [...SYNTHETIC_DEMO_LOTS_BY_ID.values()].map((lot) => ({
    type: "Feature",
    properties: { lotId: lot.lotId, farmId: lot.farmId, crop: lot.crop },
    geometry: { type: "Polygon", coordinates: [lot.ring] },
  })),
}

export const SYNTHETIC_DEMO_FARMS_GEOJSON: FeatureCollection<
  Polygon,
  { farmId: string }
> = {
  type: "FeatureCollection",
  features: SYNTHETIC_DEMO_FARMS.map((farm) => ({
    type: "Feature",
    properties: { farmId: farm.farmId },
    geometry: { type: "Polygon", coordinates: [farm.ring] },
  })),
}
