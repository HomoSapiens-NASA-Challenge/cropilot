// Main input references, not a replacement for each calculation's full method.
const MARKET_INPUTS = [
  "nasa_power",
  "noaa_oni",
  "magyp_yields",
  "magyp_margins",
  "a3_futures",
]

const INPUTS: Record<string, readonly string[]> = {
  team_market_model: MARKET_INPUTS,
  team_market_backtest: MARKET_INPUTS,
  team_water_scenarios: [
    "nasa_power",
    "soilgrids",
    "ftw",
    "inta_crop_map",
    "fao56",
  ],
  team_crop_map: ["nasa_hls", "inta_crop_map", "ftw", "noaa_oni"],
  team_rl_mdp: MARKET_INPUTS,
  team_rl_lab: ["nasa_power", "magyp_yields", "fao56"],
  team_analog_approach: ["nasa_power", "noaa_oni", "magyp_yields"],
}

export function originalInputIds(id: string): readonly string[] {
  return Object.hasOwn(INPUTS, id) ? INPUTS[id] : []
}

export function isCalculationReference(id: string): boolean {
  return Object.hasOwn(INPUTS, id)
}
