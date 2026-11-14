import type { Season, Strategy } from "@cropilot/api"
import type { Flag } from "./data"

/** Median of the finite values; null if there are none. Missing values are skipped, never read as zero. */
export function median(
  values: ReadonlyArray<number | null | undefined>
): number | null {
  const xs = values
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    .sort((a, b) => a - b)
  if (xs.length === 0) return null
  const mid = Math.floor(xs.length / 2)
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2
}

export interface SeasonPoint {
  season_id: string
  value: number
  similar: boolean
}

export interface StrategySummary {
  /** Median margin over similar seasons that have a value. */
  median: number | null
  /** Similar seasons with a value. */
  n: number
  /** Similar seasons in the bundle, with or without a value. */
  nSimilar: number
  worst: SeasonPoint | null
  points: SeasonPoint[]
}

export function summarizeStrategy(
  strategy: Strategy,
  seasons: ReadonlyArray<Season>
): StrategySummary {
  const points: SeasonPoint[] = []
  for (const s of seasons) {
    const value = strategy.margin.by_season[s.season_id]
    if (value === null || value === undefined) continue
    points.push({ season_id: s.season_id, value, similar: s.is_similar })
  }
  const similar = points.filter((p) => p.similar)
  const worst = similar.reduce<SeasonPoint | null>(
    (w, p) => (w === null || p.value < w.value ? p : w),
    null
  )
  return {
    median: median(similar.map((p) => p.value)),
    n: similar.length,
    nSimilar: seasons.filter((s) => s.is_similar).length,
    worst,
    points,
  }
}

export interface FlagCount {
  /** Seasons where the flag is true. */
  yes: number
  /** Seasons where the flag is known (true or false). */
  known: number
  /** All seasons considered. */
  total: number
}

/** Counts a climate flag. Unknown (null) seasons are reported apart, never counted as "no". */
export function countFlag(
  seasons: ReadonlyArray<Season>,
  flag: Flag
): FlagCount {
  let yes = 0
  let known = 0
  for (const s of seasons) {
    const v = s[flag]
    if (v === null) continue
    known++
    if (v) yes++
  }
  return { yes, known, total: seasons.length }
}

/** A "nice" step (1, 2 or 5 × 10^k) that gives about `target` intervals over the span. */
export function niceStep(span: number, target = 5): number {
  if (!(span > 0) || !Number.isFinite(span)) return 1
  const raw = span / target
  const pow = 10 ** Math.floor(Math.log10(raw))
  const m = raw / pow
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * pow
}

/**
 * Shared x-domain for margins: snapped outward to half a tick step, so the data fills
 * the width instead of starting at a round zero. Returns the domain and the tick step.
 */
export function marginScale(values: ReadonlyArray<number>): {
  domain: [number, number]
  step: number
} {
  const xs = values.filter(Number.isFinite)
  if (xs.length === 0) return { domain: [0, 100], step: 50 }
  const lo = Math.min(...xs)
  const hi = Math.max(...xs)
  const span = hi - lo || Math.max(Math.abs(hi), 100)
  const step = niceStep(span)
  const pad = step / 2
  let min = Math.floor(lo / pad) * pad
  let max = Math.ceil(hi / pad) * pad
  if (min === max) {
    min -= step
    max += step
  }
  return { domain: [min, max], step }
}

/** Ticks on multiples of `step` that fall inside the domain. */
export function ticks([min, max]: [number, number], step: number): number[] {
  const out: number[] = []
  if (!(step > 0)) return out
  for (
    let v = Math.ceil(min / step) * step;
    v <= max + 1e-9 && out.length < 50;
    v += step
  )
    out.push(v)
  return out
}

/**
 * Vertical offsets (px) for dots on one line so close values don't hide each other:
 * a tiny beeswarm. Dots closer than `minGapPx` to an already placed dot alternate up/down.
 */
export function swarmOffsets(
  xsPx: ReadonlyArray<number>,
  minGapPx = 12,
  stepPx = 9
): number[] {
  const order = xsPx.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0])
  const placed: Array<{ x: number; y: number }> = []
  const out = new Array<number>(xsPx.length).fill(0)
  for (const [x, i] of order) {
    const candidates = [0, -stepPx, stepPx, -2 * stepPx, 2 * stepPx]
    const y =
      candidates.find((c) =>
        placed.every(
          (p) => Math.abs(p.x - x) >= minGapPx || Math.abs(p.y - c) >= minGapPx
        )
      ) ?? 0
    placed.push({ x, y })
    out[i] = y
  }
  return out
}
