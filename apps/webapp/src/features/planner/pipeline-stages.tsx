import type { StageProgress } from "@cropilot/api"
import { cn } from "cn"
import {
  BrainCircuit,
  Check,
  CloudSun,
  History,
  ListOrdered,
  type LucideIcon,
  Network,
  Target,
} from "lucide-react"
import { formatDuration, formatWhole } from "@/features/planner/planner-format"
import type { StageId } from "@/features/planner/planner-types"
import { translate, useI18n } from "@/lib/i18n"

type StageMeta = {
  title: string
  subtitle: string
  icon: LucideIcon
}

export const STAGE_META = {
  simulate: {
    title: "Simulate campaigns",
    subtitle: "NASA POWER weather, daily soil water balance",
    icon: CloudSun,
  },
  build_mdp: {
    title: "Build decision process",
    subtitle: "Every state the farm can be in, and what each crop does there",
    icon: Network,
  },
  solve_optimal: {
    title: "Solve exact optimum",
    subtitle: "Backward induction over every state",
    icon: Target,
  },
  train_agent: {
    title: "Train Q-learning agent",
    subtitle: "Learns by trial and error, without seeing the model",
    icon: BrainCircuit,
  },
  score_fixed: {
    title: "Score fixed rotations",
    subtitle: "Every repeating cycle and the region's named strategies",
    icon: ListOrdered,
  },
  backtest: {
    title: "Backtest on past campaigns",
    subtitle: "Each policy replayed through the simulator",
    icon: History,
  },
} as const satisfies Record<StageId, StageMeta>

/** Share of a stage's real work units done, 0 to 1. */
export function stageFraction(stage: StageProgress): number {
  if (stage.status === "done") return 1
  if (stage.status === "pending" || stage.total === 0) return 0
  return Math.min(stage.completed / stage.total, 1)
}

/** The counter of a stage in its own unit: `4,312 / 4,620 campaigns`. */
export function stageCounter(stage: StageProgress): string {
  return `${formatWhole(stage.completed)} / ${formatWhole(stage.total)} ${translate(stage.unit)}`
}

function StageNode({
  stage,
  compact,
}: {
  stage: StageProgress
  compact: boolean
}) {
  const Icon = STAGE_META[stage.stage_id].icon
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-lg border transition-colors duration-300 motion-reduce:transition-none",
        compact ? "size-7" : "size-10",
        stage.status === "pending" && "bg-background text-muted-foreground",
        stage.status === "running" &&
          "border-primary bg-primary/10 text-primary",
        stage.status === "done" &&
          "border-primary bg-primary text-primary-foreground"
      )}
    >
      {stage.status === "running" && (
        <span
          aria-hidden
          className="absolute inset-0 animate-ping rounded-lg border border-primary opacity-40 motion-reduce:animate-none"
        />
      )}
      {stage.status === "done" ? (
        <Check aria-hidden className={compact ? "size-3.5" : "size-4"} />
      ) : (
        <Icon aria-hidden className={compact ? "size-3.5" : "size-4"} />
      )}
    </span>
  )
}

/** The line to the next stage, filled as far as this stage's work is done. */
function Connector({ fraction }: { fraction: number }) {
  return (
    <span
      aria-hidden
      className="relative mx-2 hidden h-0.5 flex-1 overflow-hidden rounded-full bg-border lg:block"
    >
      <span
        className="absolute inset-0 origin-left bg-primary transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{ transform: `scaleX(${fraction})` }}
      />
    </span>
  )
}

function StageBar({ fraction }: { fraction: number }) {
  return (
    <span
      aria-hidden
      className="relative block h-0.5 w-full overflow-hidden rounded-full bg-border lg:hidden"
    >
      <span
        className="absolute inset-0 origin-left bg-primary transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{ transform: `scaleX(${fraction})` }}
      />
    </span>
  )
}

/** Every figure comes from the run snapshot. `compact` keeps only the nodes and titles. */
export function PipelineStages({
  stages,
  compact = false,
}: {
  stages: ReadonlyArray<StageProgress>
  compact?: boolean
}) {
  const { t } = useI18n("app")

  return (
    <ol
      className={cn(
        "grid",
        compact
          ? "grid-cols-3 gap-x-3 gap-y-3 lg:grid-cols-6 lg:gap-x-0"
          : "gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-6 lg:gap-x-0"
      )}
    >
      {stages.map((stage, index) => {
        const meta = STAGE_META[stage.stage_id]
        const fraction = stageFraction(stage)
        const isLast = index === stages.length - 1
        return (
          <li
            key={stage.stage_id}
            aria-current={stage.status === "running" ? "step" : undefined}
            className="flex min-w-0 flex-col gap-2 lg:pr-2"
          >
            <div className="flex items-center lg:-mr-2">
              <StageNode stage={stage} compact={compact} />
              {!isLast && <Connector fraction={fraction} />}
            </div>
            <div className="flex flex-col gap-1">
              <span
                className={cn(
                  "font-medium",
                  compact ? "text-xs" : "text-sm",
                  stage.status === "pending" && "text-muted-foreground"
                )}
              >
                {t(meta.title)}
              </span>
              {!compact && (
                <span className="text-xs text-muted-foreground">
                  {t(meta.subtitle)}
                </span>
              )}
            </div>
            {compact ? (
              <StageBar fraction={fraction} />
            ) : (
              <div className="mt-auto flex flex-col gap-1.5 text-xs tabular-nums">
                {stage.status === "pending" ? (
                  <span className="text-muted-foreground">{t("Waiting")}</span>
                ) : (
                  <>
                    <span className="text-foreground">
                      {stageCounter(stage)}
                    </span>
                    {stage.elapsed_ms !== null && (
                      <span className="text-muted-foreground">
                        {formatDuration(stage.elapsed_ms)}
                      </span>
                    )}
                  </>
                )}
                <StageBar fraction={fraction} />
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
