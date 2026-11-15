import { cn } from "cn"

// Farmland seen from a drone: rural blocks between roads, each split into lots
// that are sown in straight rows or left fallow. The ground is laid out flat in
// ground units, turned, and projected in perspective onto the view, so the near
// lots are large and the far ones shrink toward a horizon above the frame.

/** Wider than the hero frame so the fields bleed into the side gutter on wide screens. */
const VIEW_WIDTH = 2200
const VIEW_HEIGHT = 760
/** Lots that end left of this are fully under the fade of `mask-l-to-75%` and are skipped. */
const FADED_OUT_X = VIEW_WIDTH * 0.25
/** Horizon above the top edge: the frame only shows ground, never sky. */
const HORIZON_Y = -420
const VANISHING_X = 1060
const FOCAL = 1000
/** Sets how fast lots shrink with depth: the bottom edge sits at depth 100. */
const CAMERA_HEIGHT = 118
const GROUND_TURN = (32 * Math.PI) / 180
/** Depth of the ground origin in front of the camera. */
const GROUND_DEPTH = 190
/** Lots closer than this are behind the bottom edge and are skipped. */
const NEAR_DEPTH = 40

/** Distance between rural roads, in ground units. */
const BLOCK = 30
const ROAD = 1.2
const LOT_GAP = 0.6
/** Blocks laid out on each side of the ground origin, along both axes. */
const BLOCK_REACH = 16
/** Ways a block is split into lots: parts along u, parts along v. */
const BLOCK_SPLITS = [
  [1, 1],
  [2, 1],
  [3, 1],
  [1, 2],
  [1, 3],
  [2, 2],
] as const
const ROW_SPACINGS = [0.9, 1.3] as const
const FALLOW_SHARE = 0.22
/** The accent lot is the sown lot whose center lands closest to this point. */
const ACCENT_TARGET = { x: 1170, y: 220 }

type Point = { x: number; y: number }
type Segment = [Point, Point]
type Lot = { outline: Point[]; rows: Segment[]; center: Point }

/** Deterministic random numbers (mulberry32), so the drawing is the same on every load. */
function seededRandom(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let mix = Math.imul(state ^ (state >>> 15), 1 | state)
    mix = (mix + Math.imul(mix ^ (mix >>> 7), 61 | mix)) ^ mix
    return ((mix ^ (mix >>> 14)) >>> 0) / 4_294_967_296
  }
}

function depthOf(u: number, v: number) {
  return GROUND_DEPTH + u * Math.sin(GROUND_TURN) + v * Math.cos(GROUND_TURN)
}

function project(u: number, v: number): Point {
  const lateral = u * Math.cos(GROUND_TURN) - v * Math.sin(GROUND_TURN)
  const depth = depthOf(u, v)
  return {
    x: VANISHING_X + (FOCAL * lateral) / depth,
    y: HORIZON_Y + (FOCAL * CAMERA_HEIGHT) / depth,
  }
}

/** The lots of one block along one axis, with a narrow gap between them. */
function lotSpans(start: number, parts: number): Array<[number, number]> {
  const size = (BLOCK - ROAD - (parts - 1) * LOT_GAP) / parts
  return Array.from({ length: parts }, (_, index) => {
    const from = start + index * (size + LOT_GAP)
    return [from, from + size]
  })
}

function buildLot(
  [u0, u1]: [number, number],
  [v0, v1]: [number, number],
  random: () => number
): Lot {
  const outline = [
    project(u0, v0),
    project(u1, v0),
    project(u1, v1),
    project(u0, v1),
  ]
  const center = project((u0 + u1) / 2, (v0 + v1) / 2)
  if (random() < FALLOW_SHARE) {
    return { outline, rows: [], center }
  }
  const spacing = ROW_SPACINGS[Math.floor(random() * ROW_SPACINGS.length)]
  const alongU = random() < 0.5
  const span = alongU ? v1 - v0 : u1 - u0
  const count = Math.floor(span / spacing)
  const margin = (span - (count - 1) * spacing) / 2
  const rows = Array.from({ length: count }, (_, index): Segment => {
    const offset = margin + index * spacing
    return alongU
      ? [project(u0, v0 + offset), project(u1, v0 + offset)]
      : [project(u0 + offset, v0), project(u0 + offset, v1)]
  })
  return { outline, rows, center }
}

function isVisible(lot: Lot, cornerDepths: number[]) {
  const xs = lot.outline.map((point) => point.x)
  const ys = lot.outline.map((point) => point.y)
  return (
    Math.min(...cornerDepths) > NEAR_DEPTH &&
    Math.max(...xs) > FADED_OUT_X &&
    Math.min(...xs) < VIEW_WIDTH &&
    Math.max(...ys) > 0 &&
    Math.min(...ys) < VIEW_HEIGHT
  )
}

function buildLots(): Lot[] {
  const random = seededRandom(2026)
  const lots: Lot[] = []
  for (let across = -BLOCK_REACH; across < BLOCK_REACH; across++) {
    for (let deep = -BLOCK_REACH; deep < BLOCK_REACH; deep++) {
      const [partsU, partsV] =
        BLOCK_SPLITS[Math.floor(random() * BLOCK_SPLITS.length)]
      for (const [u0, u1] of lotSpans(across * BLOCK, partsU)) {
        for (const [v0, v1] of lotSpans(deep * BLOCK, partsV)) {
          const lot = buildLot([u0, u1], [v0, v1], random)
          const cornerDepths = [
            depthOf(u0, v0),
            depthOf(u1, v0),
            depthOf(u1, v1),
            depthOf(u0, v1),
          ]
          if (isVisible(lot, cornerDepths)) {
            lots.push(lot)
          }
        }
      }
    }
  }
  return lots
}

const coordinate = (point: Point) =>
  `${point.x.toFixed(1)} ${point.y.toFixed(1)}`
const segmentPath = ([start, end]: Segment) =>
  `M${coordinate(start)}L${coordinate(end)}`
const outlinePath = (outline: Point[]) =>
  `M${outline.map(coordinate).join("L")}Z`

const LOTS = buildLots()
const distanceToAccentTarget = (lot: Lot) =>
  Math.hypot(lot.center.x - ACCENT_TARGET.x, lot.center.y - ACCENT_TARGET.y)
const ACCENT_LOT = LOTS.filter((lot) => lot.rows.length > 0).reduce(
  (closest, lot) =>
    distanceToAccentTarget(lot) < distanceToAccentTarget(closest)
      ? lot
      : closest
)
const PLAIN_LOTS = LOTS.filter((lot) => lot !== ACCENT_LOT)
const OUTLINES_PATH = PLAIN_LOTS.map((lot) => outlinePath(lot.outline)).join("")
const ROWS_PATH = PLAIN_LOTS.flatMap((lot) => lot.rows.map(segmentPath)).join(
  ""
)
const ACCENT_OUTLINE_PATH = outlinePath(ACCENT_LOT.outline)
const ACCENT_ROW_PATHS = ACCENT_LOT.rows.map(segmentPath)
/** Shifts the box left so that its `left` lands on the accent lot instead of its own edge. */
const ACCENT_SHIFT = `${((-100 * ACCENT_LOT.center.x) / VIEW_WIDTH).toFixed(2)}% 0`

/**
 * Decorative farmland of the landing hero; the other surfaces keep the strands
 * of `StrandsArt`. It is a drawing, not a map: the lots carry no data. One lot
 * carries the accent, and its rows are sown in on mount.
 *
 * The box is as tall as the parent, keeps the drawing's aspect ratio and is
 * placed so the accent lot falls at `accentX` of the parent's width. The
 * fields fade out to the left of the accent lot, where the parent's text goes,
 * and toward the far edge at the top.
 */
export function FieldsArt({
  accentX,
  className,
}: {
  /** Where the accent lot falls, as a share of the parent's width. */
  accentX: `${number}%`
  className?: string
}) {
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      fill="none"
      strokeLinecap="round"
      style={{ left: accentX, translate: ACCENT_SHIFT }}
      className={cn(
        "pointer-events-none absolute top-0 aspect-[2200/760] h-full mask-t-from-60% mask-b-from-90% mask-l-from-55% mask-l-to-75%",
        className
      )}
    >
      <path
        d={OUTLINES_PATH}
        vectorEffect="non-scaling-stroke"
        className="stroke-muted-foreground/30"
      />
      <path
        d={ROWS_PATH}
        vectorEffect="non-scaling-stroke"
        className="stroke-muted-foreground/20"
      />
      <path
        d={ACCENT_OUTLINE_PATH}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        className="fill-primary/5 stroke-primary/80"
      />
      {ACCENT_ROW_PATHS.map((path, index) => (
        <path
          key={path}
          d={path}
          pathLength={1}
          vectorEffect="non-scaling-stroke"
          className="stroke-primary/60 motion-safe:animate-sow"
          style={{ animationDelay: `${400 + index * 40}ms` }}
        />
      ))}
    </svg>
  )
}
