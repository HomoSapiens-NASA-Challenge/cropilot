import type {
  PriorityWeights,
  Region,
  RotationPlanResult,
  RotationPlanRun,
} from "@cropilot/api"
import { cn } from "cn"
import { BrainCircuit, Info, RotateCcw, TriangleAlert } from "lucide-react"
import { type ReactNode, useState } from "react"
import { Button } from "@/components/ui/button"
import { BacktestTimeline } from "@/features/planner/backtest-timeline"
import { ConvergenceChart } from "@/features/planner/convergence-chart"
import { DecisionMap } from "@/features/planner/decision-map"
import { MethodBlock } from "@/features/planner/method-block"
import {
  DEFAULT_PRESET,
  type OUTCOMES,
  totalWeight,
} from "@/features/planner/planner-outcomes"
import { PolicyComparison } from "@/features/planner/policy-comparison"
import { PrioritiesPanel } from "@/features/planner/priorities-panel"
import { ResultSection } from "@/features/planner/result-section"
import {
  RunSummary,
  TrainingConsole,
} from "@/features/planner/training-console"
import { usePlannerRun } from "@/features/planner/use-planner-run"
import { VerdictBlock } from "@/features/planner/verdict-block"

const DEFAULT_HORIZON_CAMPAIGNS = 3

type OutcomeId = (typeof OUTCOMES)[number]["id"]

function Notice({
  children,
  action,
}: {
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-destructive/30 bg-card p-4 text-sm"
    >
      <p className="flex items-start gap-2">
        <TriangleAlert
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-destructive"
        />
        <span>{children}</span>
      </p>
      {action}
    </div>
  )
}

function Results({
  run,
  result,
  isDimmed,
}: {
  run: RotationPlanRun
  result: RotationPlanResult
  isDimmed: boolean
}) {
  return (
    <div
      // A different run replays the entrance, so new results do not just swap in.
      key={run.run_id}
      inert={isDimmed}
      className={cn(
        "flex animate-reveal flex-col gap-8 transition-opacity duration-300 motion-reduce:animate-none motion-reduce:transition-none",
        isDimmed && "opacity-50"
      )}
    >
      <VerdictBlock result={result} />
      <DecisionMap result={result} />
      <ResultSection
        title="How the agent learned"
        lead="Each agent's score at every training checkpoint, against the exact optimum the solver found."
      >
        <ConvergenceChart
          points={run.convergence}
          optimalScore={run.optimal_score}
          episodesPerAgent={result.episodes}
          agentSeeds={run.agent_seeds}
        />
      </ResultSection>
      <PolicyComparison result={result} />
      <BacktestTimeline result={result} />
      <MethodBlock result={result} />
    </div>
  )
}

/** The rotation planner: priorities in, a live run, and the results of the last finished run. */
export function PlannerScreen({ region }: { region: Region }) {
  const [weights, setWeights] = useState<PriorityWeights>(
    DEFAULT_PRESET.weights
  )
  const [horizon, setHorizon] = useState(DEFAULT_HORIZON_CAMPAIGNS)
  const planner = usePlannerRun()

  const run = (nextWeights: PriorityWeights, nextHorizon: number) => {
    if (totalWeight(nextWeights) <= 0) return
    planner.startRun({
      weights: nextWeights,
      horizon_campaigns: nextHorizon,
    })
  }

  const { run: current, previousRun } = planner
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
    <div className="flex flex-col gap-8">
      <p className="flex max-w-3xl items-start gap-2 text-sm text-muted-foreground">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>
          Simulated for {region.name}.
          {region.known_limit ? ` ${region.known_limit}` : ""}
        </span>
      </p>

      <PrioritiesPanel
        weights={weights}
        horizon={horizon}
        isStarting={planner.isStarting}
        onWeightChange={(id: OutcomeId, value) =>
          setWeights((previous) => ({ ...previous, [id]: value }))
        }
        onWeightCommit={(id: OutcomeId, value) => {
          const next = { ...weights, [id]: value }
          setWeights(next)
          run(next, horizon)
        }}
        onPreset={(next) => {
          setWeights(next)
          run(next, horizon)
        }}
        onHorizon={(next) => {
          setHorizon(next)
          run(weights, next)
        }}
        onRun={() => run(weights, horizon)}
      />

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

      {current && current.status !== "done" && (
        <TrainingConsole run={current} compact={shown !== null} />
      )}
      {current?.status === "done" && <RunSummary run={current} />}

      {shown ? (
        <Results
          run={shown.run}
          result={shown.result}
          isDimmed={shown.isDimmed}
        />
      ) : (
        !current &&
        !planner.isGone && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
            <BrainCircuit aria-hidden className="size-6 text-primary" />
            <p className="max-w-md text-sm text-muted-foreground">
              Set your priorities and run the planner. It simulates this region,
              finds the best rotation for them and replays it on past campaigns.
            </p>
          </div>
        )
      )}
    </div>
  )
}
