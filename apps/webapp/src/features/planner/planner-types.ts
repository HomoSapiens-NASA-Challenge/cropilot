import type {
  DecisionCell,
  Itinerary,
  PolicyResult,
  StageProgress,
} from "@cropilot/api"

// The generated client inlines these unions, and its `EnsoPhase` and `Decision` names belong
// to the case contract, so the planner's own are read off the fields that use them.
export type Action = Itinerary["winter"]
export type EnsoPhase = DecisionCell["enso"]
export type PolicyKind = PolicyResult["kind"]
export type StageId = StageProgress["stage_id"]
