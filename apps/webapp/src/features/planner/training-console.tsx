import type { RotationPlanRun, StageProgress } from "@cropilot/api"
import { cn } from "cn"
import { Check } from "lucide-react"
import { Card } from "@/components/ui/card"
import { ConvergenceChart } from "@/features/planner/convergence-chart"
import {
  PipelineStages,
  STAGE_META,
  stageCounter,
} from "@/features/planner/pipeline-stages"
import { formatDuration, formatWhole } from "@/features/planner/planner-format"

function totalElapsedMs(stages: ReadonlyArray<StageProgress>): number {
  return stages.reduce((sum, stage) => sum + (stage.elapsed_ms ?? 0), 0)
}

function statusLine(run: RotationPlanRun): string {
  if (run.status === "queued") return "Queued, waiting for a worker"
  if (run.status === "failed") return "The run failed"
  if (run.status === "cancelled") return "The run was replaced by a newer one"
  const active = run.stages.find((stage) => stage.status === "running")
  if (!active) return "Running"
  const title = STAGE_META[active.stage_id].title
  if (active.stage_id === "train_agent") {
    // Agents train one after another, so the newest seed seen is the one in progress.
    const current =
      Math.max(-1, ...run.convergence.map((point) => point.seed)) + 1
    return `${title}: agent ${Math.max(current, 1)} of ${run.agent_seeds} - ${stageCounter(active)}`
  }
  return `${title}: ${stageCounter(active)}`
}

/**
 * The live view of a run: its pipeline and, once the agent starts learning, the convergence
 * chart. Everything on it is read from the run snapshot the browser polls.
 */
export function TrainingConsole({
  run,
  compact = false,
}: {
  run: RotationPlanRun
  compact?: boolean
}) {
  const training = run.stages.find((stage) => stage.stage_id === "train_agent")
  const showChart =
    !compact &&
    training !== undefined &&
    (training.status !== "pending" || run.convergence.length > 0)

  return (
    <Card
      aria-busy={run.status === "queued" || run.status === "running"}
      className={cn(
        "sm:[--card-spacing:--spacing(6)]",
        compact ? "gap-4" : "gap-6"
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-(--card-spacing)">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-medium">Training console</h2>
          <p
            role="status"
            className="text-sm tabular-nums text-muted-foreground"
          >
            {statusLine(run)}
          </p>
        </div>
        <span className="text-sm tabular-nums text-muted-foreground">
          {formatDuration(totalElapsedMs(run.stages))} elapsed
        </span>
      </div>

      <div className="px-(--card-spacing)">
        <PipelineStages stages={run.stages} compact={compact} />
      </div>

      {showChart && training && (
        <div className="mx-(--card-spacing) flex flex-col gap-3 border-t pt-6">
          <h3 className="text-sm font-medium">
            The agents closing in on the optimum
          </h3>
          <ConvergenceChart
            points={run.convergence}
            optimalScore={run.optimal_score}
            episodesPerAgent={training.total / run.agent_seeds}
            agentSeeds={run.agent_seeds}
          />
        </div>
      )}
    </Card>
  )
}

/** What a finished run cost: measured time and the real counts of simulated work. */
export function RunSummary({ run }: { run: RotationPlanRun }) {
  const simulated = run.stages.find((stage) => stage.stage_id === "simulate")
  const trained = run.stages.find((stage) => stage.stage_id === "train_agent")

  return (
    <p
      role="status"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground tabular-nums"
    >
      <Check aria-hidden className="size-4 text-primary" />
      <span className="font-medium text-foreground">
        Computed in {formatDuration(totalElapsedMs(run.stages))}
      </span>
      {simulated && trained && (
        <span>
          - {formatWhole(simulated.completed)} {simulated.unit} simulated,{" "}
          {run.agent_seeds} agents x{" "}
          {formatWhole(trained.completed / run.agent_seeds)} {trained.unit}{" "}
          trained
        </span>
      )}
    </p>
  )
}
