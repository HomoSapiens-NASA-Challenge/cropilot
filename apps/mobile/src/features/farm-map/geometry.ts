/** A position as GeoJSON orders it: [longitude, latitude] in degrees. */
export type LngLat = [number, number]

const EARTH_MEAN_RADIUS_M = 6_371_008.8
const METERS_PER_DEGREE = (2 * Math.PI * EARTH_MEAN_RADIUS_M) / 360
const SQUARE_METERS_PER_HECTARE = 10_000

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Area of a ring on a spherical Earth, in hectares. Spherical excess formula from
 * Chamberlain & Duquette, "Some Algorithms for Polygons on a Sphere" (JPL, 2007).
 */
export function ringAreaHa(ring: ReadonlyArray<LngLat>): number {
  let sum = 0
  for (let index = 0; index < ring.length; index++) {
    // Guards for mobile's noUncheckedIndexedAccess; the web copy reads directly.
    const current = ring[index]
    const next = ring[(index + 1) % ring.length]
    if (current === undefined || next === undefined) {
      continue
    }
    const [lon1, lat1] = current
    const [lon2, lat2] = next
    sum +=
      toRadians(lon2 - lon1) *
      (2 + Math.sin(toRadians(lat1)) + Math.sin(toRadians(lat2)))
  }
  const areaM2 = Math.abs((sum * EARTH_MEAN_RADIUS_M ** 2) / 2)
  return areaM2 / SQUARE_METERS_PER_HECTARE
}

/** Mean of the distinct vertices. Good enough to place a label on a convex parcel. */
export function ringCenter(ring: ReadonlyArray<LngLat>): LngLat {
  const first = ring[0]
  const last = ring[ring.length - 1]
  const isClosed =
    ring.length > 1 &&
    first !== undefined &&
    last !== undefined &&
    first[0] === last[0] &&
    first[1] === last[1]
  const vertices = isClosed ? ring.slice(0, -1) : ring
  const lon = vertices.reduce((total, [vertexLon]) => total + vertexLon, 0)
  const lat = vertices.reduce((total, [, vertexLat]) => total + vertexLat, 0)
  return [lon / vertices.length, lat / vertices.length]
}

/** South-west and north-east corners, the shape MapLibre `fitBounds` takes. */
export function ringBounds(
  rings: ReadonlyArray<ReadonlyArray<LngLat>>
): [LngLat, LngLat] {
  const points = rings.flat()
  const lons = points.map(([lon]) => lon)
  const lats = points.map(([, lat]) => lat)
  return [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ]
}

export type RectangleCorners = {
  northWest: LngLat
  southWest: LngLat
  southEast: LngLat
  northEast: LngLat
}

/** Corners of a rotated rectangle, counter-clockwise from the north-west one. */
export function rectangleCorners({
  center,
  widthM,
  heightM,
  rotationDeg,
}: {
  center: LngLat
  widthM: number
  heightM: number
  rotationDeg: number
}): RectangleCorners {
  const [centerLon, centerLat] = center
  const metersPerDegreeLon = METERS_PER_DEGREE * Math.cos(toRadians(centerLat))
  const angle = toRadians(rotationDeg)

  const corner = (eastM: number, northM: number): LngLat => {
    const rotatedEastM = eastM * Math.cos(angle) - northM * Math.sin(angle)
    const rotatedNorthM = eastM * Math.sin(angle) + northM * Math.cos(angle)
    return [
      centerLon + rotatedEastM / metersPerDegreeLon,
      centerLat + rotatedNorthM / METERS_PER_DEGREE,
    ]
  }

  const halfWidthM = widthM / 2
  const halfHeightM = heightM / 2
  return {
    northWest: corner(-halfWidthM, halfHeightM),
    southWest: corner(-halfWidthM, -halfHeightM),
    southEast: corner(halfWidthM, -halfHeightM),
    northEast: corner(halfWidthM, halfHeightM),
  }
}

function lerp(from: LngLat, to: LngLat, fraction: number): LngLat {
  return [
    from[0] + (to[0] - from[0]) * fraction,
    from[1] + (to[1] - from[1]) * fraction,
  ]
}

/** Splits a quadrilateral into `columns × rows` closed rings, row by row from the north. */
export function splitIntoGrid(
  corners: RectangleCorners,
  columns: number,
  rows: number
): LngLat[][] {
  const at = (u: number, v: number) =>
    lerp(
      lerp(corners.northWest, corners.northEast, u),
      lerp(corners.southWest, corners.southEast, u),
      v
    )

  const cells: LngLat[][] = []
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const [u0, u1] = [column / columns, (column + 1) / columns]
      const [v0, v1] = [row / rows, (row + 1) / rows]
      cells.push([at(u0, v0), at(u0, v1), at(u1, v1), at(u1, v0), at(u0, v0)])
    }
  }
  return cells
}
