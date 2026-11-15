/** Round tick values inside [min, max] with a 1, 2 or 5 step, about `count` of them. */
export function niceTicks(min: number, max: number, count: number): number[] {
  const span = max - min
  if (!(span > 0)) return [min]
  const rawStep = span / count
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const residual = rawStep / magnitude
  const step = (residual >= 5 ? 5 : residual >= 2 ? 2 : 1) * magnitude
  const values: number[] = []
  const first = Math.ceil(min / step - 1e-9)
  const last = Math.floor(max / step + 1e-9)
  for (let index = first; index <= last; index += 1) {
    values.push(Number((index * step).toFixed(10)))
  }
  return values
}

/** A domain that holds every value, padded so lines do not touch the frame. */
export function paddedDomain(
  values: ReadonlyArray<number>,
  padding = 0.08
): [number, number] {
  const low = Math.min(...values)
  const high = Math.max(...values)
  if (low === high) return [low - 0.5, high + 0.5]
  const pad = (high - low) * padding
  return [low - pad, high + pad]
}

/** A polyline path through points that are already in pixels. */
export function linePath(points: ReadonlyArray<{ x: number; y: number }>) {
  return points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
    )
    .join(" ")
}
