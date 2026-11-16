type Rect = { x: number; y: number; width: number; height: number }

export type ZoneLabel = Rect & {
  id: string
  priority: number
  previousAnchor?: number
}

const GAPS = [17, 29]
const PADDING = 4

function overlaps(a: Rect, b: Rect) {
  return (
    a.x < b.x + b.width + PADDING &&
    a.x + a.width + PADDING > b.x &&
    a.y < b.y + b.height + PADDING &&
    a.y + a.height + PADDING > b.y
  )
}

/** Try nearby anchors without moving the actual geographic points. */
export function placeZoneLabels(
  labels: readonly ZoneLabel[],
  viewport: { width: number; height: number },
  obstacles: readonly Rect[] = []
) {
  const occupied: Rect[] = [
    ...obstacles,
    ...labels.map(({ x, y }) => ({
      x: x - 12,
      y: y - 12,
      width: 24,
      height: 24,
    })),
  ]
  const placements = new Map<string, { x: number; y: number; anchor: number }>()
  // Stable priority gives the selected/hovered zone first choice in dense areas.
  for (const label of [...labels].sort((a, b) => b.priority - a.priority)) {
    const { x, y, width, height } = label
    if (x < 0 || y < 0 || x > viewport.width || y > viewport.height) continue
    const anchors = GAPS.flatMap((gap) => [
      [gap, -height / 2],
      [-gap - width, -height / 2],
      [-width / 2, -gap - height],
      [-width / 2, gap],
      [0, -gap - height],
      [-width, -gap - height],
      [0, gap],
      [-width, gap],
      [gap, -gap - height],
      [-gap - width, -gap - height],
      [gap, gap],
      [-gap - width, gap],
    ])
    const order = anchors.map((_, index) => index)
    if (label.previousAnchor !== undefined) {
      const previous = label.previousAnchor
      order.splice(order.indexOf(previous), 1)
      order.unshift(previous)
    }
    for (const anchor of order) {
      const [dx, dy] = anchors[anchor]
      const rect = { x: x + dx, y: y + dy, width, height }
      if (
        rect.x < PADDING ||
        rect.y < PADDING ||
        rect.x + width > viewport.width - PADDING ||
        rect.y + height > viewport.height - PADDING ||
        occupied.some((other) => overlaps(rect, other))
      ) {
        continue
      }
      occupied.push(rect)
      placements.set(label.id, { x: dx, y: dy, anchor })
      break
    }
  }
  // When no nearby space remains, keep the dot and accessible name, not an overlap.
  return placements
}
