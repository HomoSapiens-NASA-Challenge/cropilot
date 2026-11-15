/** A position as GeoJSON orders it: [longitude, latitude] in degrees. */
export type LngLat = [number, number]

/** Mean of the distinct vertices. Good enough to place a label on a convex parcel. */
export function ringCenter(ring: ReadonlyArray<ReadonlyArray<number>>): LngLat {
  const first = ring[0]
  const last = ring[ring.length - 1]
  const isClosed =
    ring.length > 1 && first[0] === last[0] && first[1] === last[1]
  const vertices = isClosed ? ring.slice(0, -1) : ring
  const lon = vertices.reduce((total, vertex) => total + vertex[0], 0)
  const lat = vertices.reduce((total, vertex) => total + vertex[1], 0)
  return [lon / vertices.length, lat / vertices.length]
}

/** South-west and north-east corners, the shape MapLibre `fitBounds` takes. */
export function pointsBounds(
  points: ReadonlyArray<ReadonlyArray<number>>
): [LngLat, LngLat] {
  const lons = points.map((point) => point[0])
  const lats = points.map((point) => point[1])
  return [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ]
}
