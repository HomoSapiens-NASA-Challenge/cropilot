import {
  matchesWaterSettings,
  zCampaignPoint,
  zCaseBundle,
  zDecision,
  zLimit,
  zSourceRef,
  zStrategy,
  zWaterBlock,
} from "@cropilot/api"
import { z } from "zod"

const selection = zWaterBlock.shape.episodes.element.pick({
  depth_m: true,
  initial_water_fraction: true,
  summer_shift_days: true,
})

// MCP-only envelope. Scientific fields use the generated case-v1 validators.
const comparison = z.object({
  context: z.object({
    schema_version: zCaseBundle.shape.schema_version,
    zone_id: z.string(),
    zone_name: z.string(),
    decision: zDecision,
    sources: z.array(zSourceRef),
    limits: z.array(zLimit),
  }),
  strategies: z.array(zStrategy).min(3),
  analog_campaigns: z.array(zCampaignPoint),
  water_status: z.enum(["available", "not_available"]),
  water: zWaterBlock.nullable(),
  requested_water_selection: selection,
  available_water_selections: z.array(selection),
  selection_note: z.string(),
})

export type CardComparison = z.infer<typeof comparison>

export function readComparison(value: unknown): CardComparison {
  const result = comparison.parse(value)
  if (result.water) {
    if (
      !result.available_water_selections.some((item) =>
        matchesWaterSettings(item, result.requested_water_selection)
      ) ||
      result.water.episodes.some(
        (item) => !matchesWaterSettings(item, result.requested_water_selection)
      )
    ) {
      throw new Error("The returned water settings do not match the selection.")
    }
  }
  return result
}
