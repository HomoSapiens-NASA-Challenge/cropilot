import type { FlagDefs, Metric, Season } from "@cropilot/api"

/** A number is mock when its sources include this id. Same rule as the backend schema. */
export const MOCK_SOURCE = "mock"

export const isMock = (x: { source_ids: ReadonlyArray<string> }) =>
  x.source_ids.includes(MOCK_SOURCE)

export type Provenance = Metric["provenance"]
export type EnsoPhase = Season["enso_phase"]
export type Flag = keyof FlagDefs

/** Climate flags in display order. Labels and definitions travel in the bundle. */
export const FLAGS = [
  "water_deficit_at_flowering",
  "heat_at_flowering",
  "excess_water",
] as const satisfies ReadonlyArray<Flag>

/** Glass surfaces: theme tokens only, merged over the shadcn defaults by `cn`. */
export const GLASS =
  "bg-(--glass-bg) shadow-xl shadow-(color:--glass-shadow) ring-1 ring-(--glass-ring) backdrop-blur-2xl backdrop-saturate-150"
export const GLASS_STRONG =
  "bg-(--glass-bg-strong) ring-1 ring-(--glass-ring) backdrop-blur-2xl backdrop-saturate-150"

/** Focus ring for custom interactive elements. */
export const FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-ring"
