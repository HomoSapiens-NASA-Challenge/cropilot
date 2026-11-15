import type {
  CampaignPoint,
  WaterBlock,
  WaterEpisode,
} from "./generated/types.gen"

export type WaterSettings = Pick<
  WaterEpisode,
  "depth_m" | "initial_water_fraction" | "summer_shift_days"
>

export function defaultWaterSettings(water: WaterBlock): WaterSettings {
  return {
    depth_m: water.default_depth_m,
    initial_water_fraction: water.default_initial_water_fraction,
    summer_shift_days: 0,
  }
}

export function matchesWaterSettings(
  entry: WaterSettings,
  settings: WaterSettings
): boolean {
  return (
    entry.depth_m === settings.depth_m &&
    entry.initial_water_fraction === settings.initial_water_fraction &&
    entry.summer_shift_days === settings.summer_shift_days
  )
}

export function hasWaterRuns(
  water: WaterBlock,
  settings: WaterSettings,
  scenarioId?: string
): boolean {
  return water.episodes.some(
    (episode) =>
      matchesWaterSettings(episode, settings) &&
      (scenarioId === undefined || episode.scenario_id === scenarioId)
  )
}

export function changeWaterStartingPoint(
  water: WaterBlock,
  settings: WaterSettings,
  change: Partial<Pick<WaterSettings, "depth_m" | "initial_water_fraction">>
): WaterSettings {
  const next = { ...settings, ...change }
  return hasWaterRuns(water, next) ? next : { ...next, summer_shift_days: 0 }
}

export function waterAnalogCampaigns(
  campaigns: ReadonlyArray<CampaignPoint>
): CampaignPoint[] {
  return campaigns
    .filter((campaign) => campaign.is_analog)
    .sort(
      (a, b) =>
        (a.analog_rank ?? Infinity) - (b.analog_rank ?? Infinity) ||
        a.start_year - b.start_year
    )
}

export function findWaterEpisode(
  water: WaterBlock,
  strategyId: string,
  scenarioId: string | null,
  settings: WaterSettings
): WaterEpisode | undefined {
  if (scenarioId === null) return undefined
  return water.episodes.find(
    (episode) =>
      episode.strategy_id === strategyId &&
      episode.scenario_id === scenarioId &&
      matchesWaterSettings(episode, settings)
  )
}
