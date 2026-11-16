import type { CaseBundle, Compare, Lot, UnharvestedRow } from "@cropilot/api"

/**
 * The findings of a case that the highlights block puts first. Every number is counted
 * from the bundle; a finding the bundle cannot back is null and its card is not drawn.
 */

export type LeaderFinding = {
  campaigns: number
  /** Rotations that led at least one analog campaign, the most frequent first. */
  leaderIds: string[]
  pairsThatSwap: number
  pairs: number
}

export function leaderFinding(compare: Compare): LeaderFinding | null {
  const wins = new Map<string, number>()
  for (const analog of compare.analog_margins) {
    const leader = analog.leading_strategy_id
    if (leader !== null) wins.set(leader, (wins.get(leader) ?? 0) + 1)
  }
  if (wins.size === 0) return null

  const pairs = compare.ranking_changes.filter(
    (change) => change.metric === "gross_margin"
  )
  return {
    campaigns: [...wins.values()].reduce((sum, count) => sum + count, 0),
    leaderIds: [...wins.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([id]) => id),
    pairsThatSwap: pairs.filter((change) => change.order_inverts).length,
    pairs: pairs.length,
  }
}

export type RentFinding = {
  /** The rotation mapped as current, when the case has one with margins. */
  currentStrategyId: string | null
  /** Analog campaigns with an after-rent margin for the counted rotation. */
  campaigns: number
  /** Of those, the ones that ended below rent. */
  belowRent: number
  /** Analog campaigns in which no rotation covered rent. */
  noneCovered: string[]
}

export function rentFinding(compare: Compare): RentFinding | null {
  const current = compare.strategies.find((strategy) => strategy.is_current)

  const noneCovered: string[] = []
  const currentMargins: number[] = []
  let campaignsWithRent = 0
  for (const analog of compare.analog_margins) {
    const afterRent = analog.margins.flatMap((margin) =>
      margin.gross_margin_after_rent_usd_ha === null
        ? []
        : [
            {
              id: margin.strategy_id,
              value: margin.gross_margin_after_rent_usd_ha,
            },
          ]
    )
    if (afterRent.length === 0) continue
    campaignsWithRent += 1
    if (afterRent.every((entry) => entry.value < 0)) {
      noneCovered.push(analog.campaign)
    }
    const own = afterRent.find((entry) => entry.id === current?.strategy_id)
    if (own) currentMargins.push(own.value)
  }
  if (campaignsWithRent === 0) return null

  const hasCurrent = current !== undefined && currentMargins.length > 0
  const belowRent = hasCurrent
    ? currentMargins.filter((value) => value < 0).length
    : noneCovered.length
  if (belowRent === 0 && noneCovered.length === 0) return null

  return {
    currentStrategyId: hasCurrent ? current.strategy_id : null,
    campaigns: hasCurrent ? currentMargins.length : campaignsWithRent,
    belowRent,
    noneCovered,
  }
}

export type SowingFinding = {
  shiftDays: number
  episodes: number
  rotations: number
  /** Episodes with less unmet crop water, in the rotation with the fewest and the most. */
  fewestLower: number
  mostLower: number
  /** Median reduction of unmet crop water, smallest and largest across rotations. */
  smallestMedianMm: number
  largestMedianMm: number
}

/** The latest sowing date of the scenarios, only where it lowers unmet water in every rotation. */
export function sowingFinding(compare: Compare): SowingFinding | null {
  const { water } = compare
  if (!water) return null

  const shiftDays = Math.max(...water.summer_shift_days)
  if (!(shiftDays > 0)) return null
  const effects = water.calendar_effects.filter(
    (effect) => effect.summer_shift_days === shiftDays
  )
  const [first] = effects
  if (!first) return null
  const lowersEverywhere = effects.every(
    (effect) =>
      effect.count === first.count &&
      effect.lower_count > effect.higher_count &&
      effect.median_mm < 0
  )
  if (!lowersEverywhere) return null

  const lower = effects.map((effect) => effect.lower_count)
  const reductions = effects.map((effect) => -effect.median_mm)
  return {
    shiftDays,
    episodes: first.count,
    rotations: effects.length,
    fewestLower: Math.min(...lower),
    mostLower: Math.max(...lower),
    smallestMedianMm: Math.min(...reductions),
    largestMedianMm: Math.max(...reductions),
  }
}

type MeasuredUnharvested = UnharvestedRow & { mean_pct: number }

export type AreaFinding = {
  /** The El Niño phase with the highest mean share of area not harvested. */
  worst: MeasuredUnharvested
  /** The phase of the campaign being decided, when it is another one. */
  current: MeasuredUnharvested | null
}

/** Soybean only: maize left standing is often cut for silage, so its figure is not a loss. */
const AREA_CROP = "Soybean"

export function areaFinding(bundle: CaseBundle): AreaFinding | null {
  const rows = bundle.compare.unharvested.filter(
    (row): row is MeasuredUnharvested =>
      row.crop === AREA_CROP && row.mean_pct !== null
  )
  const [firstRow] = rows
  if (!firstRow) return null
  const worst = rows.reduce(
    (highest, row) => (row.mean_pct > highest.mean_pct ? row : highest),
    firstRow
  )
  if (worst.mean_pct <= 0) return null

  const currentPhase = bundle.years_like_this.current.enso_phase
  const current = rows.find((row) => row.enso_phase === currentPhase)
  return {
    worst,
    current: current && current !== worst ? current : null,
  }
}

export type FieldFinding = {
  campaign: string
  /** Fields with a status for the latest campaign. */
  read: number
  /** Fields whose peak greenness is under the zone's fields with the same crop. */
  below: number
  /** Fields with no zone reference or no recognised summer crop. */
  toCheck: number
}

export function fieldFinding(lots: ReadonlyArray<Lot>): FieldFinding | null {
  const read = lots.filter((lot) => lot.status !== null)
  const [first] = read
  if (!first) return null
  return {
    campaign: first.latest_campaign,
    read: read.length,
    below: read.filter(
      (lot) => lot.status === "watch" || lot.status === "alert"
    ).length,
    toCheck: read.filter((lot) => lot.status === "check").length,
  }
}
