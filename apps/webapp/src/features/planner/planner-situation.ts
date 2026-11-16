import type {
  DecisionCell,
  RotationPlanResult,
  RotationPlanSetup,
} from "@cropilot/api"
import { ENSO_ORDER } from "@/features/planner/planner-format"
import type { EnsoPhase } from "@/features/planner/planner-types"

/**
 * Where the farm stands on June 1, as the reader chose it in step 1 of the wizard. It is a
 * lens on a finished run, not a request field: the solved policy already covers every state.
 */
export type Situation = {
  waterFraction: number
  ensoJune: EnsoPhase
  /** The phase known at the end of August, or `null` while it is not known yet. */
  ensoAugust: EnsoPhase | null
}

/** One possible El Niño phase in August, with the decision the plan takes if it happens. */
export type AugustBranch = {
  ensoAugust: EnsoPhase
  /** The August decision after the winter crop the June decision picks; `null` if the map has none. */
  cell: DecisionCell | null
  /** Training campaigns where this June phase was followed by this August phase. */
  trainingCampaigns: number
  /** Training campaigns that started in this June phase, whatever August brought. */
  juneTrainingCampaigns: number
  /** The branch the situation says is happening. */
  isKnown: boolean
}

export type NextCampaign = {
  /** The June decision for the situation; `null` if the map has no such state. */
  june: DecisionCell | null
  /** One branch per August phase, in `ENSO_ORDER`. */
  branches: ReadonlyArray<AugustBranch>
}

const WATER_TOLERANCE = 1e-9

/** The water fraction of one of the simulator's evenly spaced levels (0 to `levels - 1`). */
export function waterFractionOfLevel(level: number, levels: number): number {
  return level / (levels - 1)
}

/** The level a water fraction rounds to, as the simulator does. */
export function waterLevelOfFraction(fraction: number, levels: number): number {
  return Math.round(Math.min(Math.max(fraction, 0), 1) * (levels - 1))
}

/** Without a published NOAA reading the phase falls back to neutral, which the wizard labels as a placeholder. */
export function defaultSituation(setup: RotationPlanSetup): Situation {
  return {
    waterFraction: waterFractionOfLevel(
      waterLevelOfFraction(setup.initial_water_fraction, setup.water_levels),
      setup.water_levels
    ),
    ensoJune: setup.latest_enso_june?.phase ?? "neutral",
    ensoAugust: setup.latest_enso_august?.phase ?? null,
  }
}

function isSameWater(cell: DecisionCell, waterFraction: number): boolean {
  return Math.abs(cell.water_fraction - waterFraction) < WATER_TOLERANCE
}

/** August reads the June 1 soil water: the August decision never sees August soil water. */
export function nextCampaign(
  result: RotationPlanResult,
  situation: Situation
): NextCampaign {
  const june =
    result.decisions.find(
      (cell) =>
        cell.decision === "june" &&
        cell.enso === situation.ensoJune &&
        isSameWater(cell, situation.waterFraction)
    ) ?? null

  const fromJune = result.enso_transitions.filter(
    (row) => row.enso_june === situation.ensoJune
  )
  const juneTrainingCampaigns = fromJune.reduce(
    (sum, row) => sum + row.training_campaigns,
    0
  )

  const branches = ENSO_ORDER.map((ensoAugust): AugustBranch => {
    const cell =
      june === null
        ? null
        : (result.decisions.find(
            (candidate) =>
              candidate.decision === "august" &&
              candidate.winter === june.optimal_action &&
              candidate.enso === ensoAugust &&
              isSameWater(candidate, situation.waterFraction)
          ) ?? null)
    return {
      ensoAugust,
      cell,
      trainingCampaigns:
        fromJune.find((row) => row.enso_august === ensoAugust)
          ?.training_campaigns ?? 0,
      juneTrainingCampaigns,
      isKnown: situation.ensoAugust === ensoAugust,
    }
  })

  return { june, branches }
}
