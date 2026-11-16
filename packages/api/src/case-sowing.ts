import type { CaseBundle, WaterEpisode } from "./generated/types.gen"

export type SowingCell = {
  stressDays: number
  deficitMm: number
}

export type SowingCampaign = {
  campaign: string
  cells: SowingCell[]
  fewestStressDays: number
}

export type SowingShift = {
  shiftDays: number
  /** ISO date in the non-leap year 2001: only its day and month are meaningful. */
  typicalSowingDate: string
  medianStressDays: number
  medianDeficitMm: number
  /** Campaigns where this date had the fewest stress days, ties included. */
  fewestCount: number
}

export type SowingWindow = {
  crop: string
  strategyIds: string[]
  campaigns: SowingCampaign[]
  shifts: SowingShift[]
  lowestMedianStressDays: number
  lowestMedianShifts: number[]
  defaultMedianStressDays: number
  topFewestCount: number
  topFewestShifts: number[]
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const upper = sorted[Math.floor(sorted.length / 2)]
  const lower = sorted[Math.ceil(sorted.length / 2) - 1]
  if (upper === undefined || lower === undefined) {
    throw new Error("A sowing window needs at least one analog campaign")
  }
  return (lower + upper) / 2
}

function typicalSowingDate(isoDates: string[]): string {
  const days = isoDates.map((iso) => {
    const date = new Date(`${iso}T00:00:00Z`)
    return Date.UTC(2001, date.getUTCMonth(), date.getUTCDate())
  })
  return new Date(Math.round(median(days) / 86_400_000) * 86_400_000)
    .toISOString()
    .slice(0, 10)
}

function windowOf(
  strategyId: string,
  episodes: WaterEpisode[],
  shifts: number[]
): SowingWindow {
  const runs = episodes.filter((episode) => episode.strategy_id === strategyId)
  const scenarioIds = [
    ...new Set(runs.flatMap((episode) => episode.scenario_id ?? [])),
  ].sort()
  const grid = scenarioIds.map((scenarioId) =>
    shifts.map((shift) => {
      const matches = runs.filter(
        (episode) =>
          episode.scenario_id === scenarioId &&
          episode.summer_shift_days === shift
      )
      const summer = matches[0]?.crops.find((crop) => crop.crop !== "Wheat")
      if (matches.length !== 1 || !summer) {
        throw new Error(
          `Missing or duplicate summer run: ${strategyId}, ${scenarioId}, ${shift}`
        )
      }
      return summer
    })
  )
  const crop = grid[0]?.[0]?.crop
  if (crop === undefined) {
    throw new Error(`No analog runs for strategy ${strategyId}`)
  }
  if (grid.some((row) => row.some((summer) => summer.crop !== crop))) {
    throw new Error(`Inconsistent first summer crop: ${strategyId}`)
  }

  const campaigns = grid.map((row, rowIndex) => {
    const cells = row.map((summer) => ({
      stressDays: summer.mid_season_stress_days,
      deficitMm: summer.crop_et_deficit_mm,
    }))
    return {
      campaign: (scenarioIds[rowIndex] ?? "").slice("analog:".length),
      cells,
      fewestStressDays: Math.min(...cells.map((cell) => cell.stressDays)),
    }
  })

  const columns = shifts.map((shiftDays, index) => {
    const summers = grid.map((row) => row[index]).filter((s) => s !== undefined)
    const stressDays = summers.map((summer) => summer.mid_season_stress_days)
    return {
      shiftDays,
      typicalSowingDate: typicalSowingDate(
        summers.map((summer) => summer.sowing_date)
      ),
      medianStressDays: median(stressDays),
      medianDeficitMm: median(
        summers.map((summer) => summer.crop_et_deficit_mm)
      ),
      fewestCount: stressDays.filter(
        (days, row) => days === campaigns[row]?.fewestStressDays
      ).length,
    }
  })

  const defaultColumn = columns.find((column) => column.shiftDays === 0)
  if (!defaultColumn) {
    throw new Error("A sowing window needs the default sowing date")
  }
  const lowestMedianStressDays = Math.min(
    ...columns.map((column) => column.medianStressDays)
  )
  const topFewestCount = Math.max(
    ...columns.map((column) => column.fewestCount)
  )
  return {
    crop,
    strategyIds: [strategyId],
    campaigns,
    shifts: columns,
    lowestMedianStressDays,
    lowestMedianShifts: columns
      .filter((column) => column.medianStressDays === lowestMedianStressDays)
      .map((column) => column.shiftDays),
    defaultMedianStressDays: defaultColumn.medianStressDays,
    topFewestCount,
    topFewestShifts: columns
      .filter((column) => column.fewestCount === topFewestCount)
      .map((column) => column.shiftDays),
  }
}

/**
 * Stress days at the mid-season stage of the first summer crop, per summer sowing shift, in the
 * analog campaigns that have water runs at the released default soil depth and starting water.
 * Strategies whose first-season results are identical share one window.
 */
export function sowingWindows(bundle: CaseBundle): SowingWindow[] {
  const water = bundle.compare.water
  if (!water) return []
  const shifts = [...water.summer_shift_days].sort((a, b) => a - b)
  const episodes = water.episodes.filter(
    (episode) =>
      episode.scenario_id?.startsWith("analog:") &&
      episode.depth_m === water.default_depth_m &&
      episode.initial_water_fraction === water.default_initial_water_fraction
  )
  const strategyIds = bundle.compare.strategies
    .map((strategy) => strategy.strategy_id)
    .filter((id) => episodes.some((episode) => episode.strategy_id === id))

  const windows = new Map<string, SowingWindow>()
  for (const strategyId of strategyIds) {
    const window = windowOf(strategyId, episodes, shifts)
    const key = JSON.stringify([window.crop, window.campaigns])
    const shared = windows.get(key)
    if (shared) shared.strategyIds.push(strategyId)
    else windows.set(key, window)
  }
  return [...windows.values()]
}
