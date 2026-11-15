import type { PriorityWeights, Region, RotationPlanSetup } from "@cropilot/api"
import { RotateCcw } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Notice } from "@/features/planner/planner-notice"
import {
  DEFAULT_PRESET,
  totalWeight,
} from "@/features/planner/planner-outcomes"
import {
  defaultSituation,
  type Situation,
} from "@/features/planner/planner-situation"
import { PlannerWizard } from "@/features/planner/planner-wizard"
import { ResultsView } from "@/features/planner/results-view"
import { SetupBar } from "@/features/planner/setup-bar"
import { TrainingConsole } from "@/features/planner/training-console"
import { usePlannerRun } from "@/features/planner/use-planner-run"

const DEFAULT_HORIZON_CAMPAIGNS = 3

/**
 * The rotation planner: a three-step wizard, then a setup bar above a live run and the
 * results of the last finished run. The setup lives here; a new region remounts the screen.
 */
export function PlannerScreen({
  region,
  setup,
}: {
  region: Region
  setup: RotationPlanSetup
}) {
  const [situation, setSituation] = useState<Situation>(() =>
    defaultSituation(setup)
  )
  const [weights, setWeights] = useState<PriorityWeights>(
    DEFAULT_PRESET.weights
  )
  const [horizon, setHorizon] = useState(DEFAULT_HORIZON_CAMPAIGNS)
  const [isEditing, setIsEditing] = useState(false)
  const planner = usePlannerRun()

  const run = (nextWeights: PriorityWeights, nextHorizon: number) => {
    if (totalWeight(nextWeights) <= 0) return
    planner.startRun({
      weights: nextWeights,
      horizon_campaigns: nextHorizon,
    })
  }

  const { run: current, previousRun } = planner
  const hasStarted =
    current !== undefined ||
    previousRun !== undefined ||
    planner.isGone ||
    planner.readError !== null
  // While the next run computes, the last finished one stays on screen, dimmed.
  const shown = current?.result
    ? { run: current, result: current.result, isDimmed: false }
    : previousRun?.result
      ? { run: previousRun, result: previousRun.result, isDimmed: true }
      : null
  const runAgain = (
    <Button variant="outline" onClick={() => run(weights, horizon)}>
      <RotateCcw aria-hidden data-icon="inline-start" />
      Run again
    </Button>
  )

  return (
    <div className="flex flex-col gap-10">
      {hasStarted && !isEditing ? (
        <SetupBar
          region={region}
          setup={setup}
          situation={situation}
          weights={weights}
          horizon={horizon}
          onPreset={(next) => {
            setWeights(next)
            run(next, horizon)
          }}
          onHorizon={(next) => {
            setHorizon(next)
            run(weights, next)
          }}
          onEdit={() => setIsEditing(true)}
          onRunAgain={() => run(weights, horizon)}
        />
      ) : (
        <PlannerWizard
          region={region}
          setup={setup}
          situation={situation}
          onSituationChange={setSituation}
          weights={weights}
          onWeightsChange={setWeights}
          horizon={horizon}
          onHorizonChange={setHorizon}
          isStarting={planner.isStarting}
          isReopened={hasStarted}
          onRun={() => {
            run(weights, horizon)
            setIsEditing(false)
          }}
          onClose={() => setIsEditing(false)}
        />
      )}

      {(planner.startError ||
        planner.readError ||
        planner.isGone ||
        current?.status === "failed" ||
        current?.status === "cancelled") && (
        <div className="flex flex-col gap-4">
          {planner.startError && <Notice>{planner.startError}</Notice>}
          {planner.readError && (
            <Notice action={runAgain}>{planner.readError}</Notice>
          )}
          {planner.isGone && (
            <Notice action={runAgain}>
              This run is gone (the server restarted). Run again.
            </Notice>
          )}
          {current?.status === "failed" && (
            <Notice action={runAgain}>
              The run failed: {current.error ?? "no error was reported"}
            </Notice>
          )}
          {current?.status === "cancelled" && (
            <Notice action={runAgain}>
              This run was replaced by a newer one before it finished.
            </Notice>
          )}
        </div>
      )}

      {current && current.status !== "done" && (
        <TrainingConsole run={current} compact={shown !== null} />
      )}

      {shown && (
        <ResultsView
          run={shown.run}
          result={shown.result}
          isDimmed={shown.isDimmed}
          situation={situation}
          onSituationChange={setSituation}
        />
      )}
    </div>
  )
}
