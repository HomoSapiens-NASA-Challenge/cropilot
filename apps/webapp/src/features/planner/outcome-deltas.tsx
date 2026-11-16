import type { OutcomeValues } from "@cropilot/api"
import { cn } from "cn"
import { formatOutcomeDelta } from "@/features/planner/planner-format"
import { OUTCOMES } from "@/features/planner/planner-outcomes"
import { useI18n } from "@/lib/i18n"

function betterOrWorse(
  id: keyof OutcomeValues,
  delta: number
): "better" | "worse" | "the same" {
  if (delta === 0) return "the same"
  const isHigherBetter = id === "margin_usd_ha"
  return delta > 0 === isHigherBetter ? "better" : "worse"
}

/** Differences in real units, first policy minus second. Margin counts up, the other four count down. */
export function OutcomeDeltas({
  deltas,
  className,
}: {
  deltas: OutcomeValues
  className?: string
}) {
  const { t } = useI18n("app")

  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5",
        className
      )}
    >
      {OUTCOMES.map((outcome) => (
        <div key={outcome.id} className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">{t(outcome.label)}</dt>
          <dd className="text-xl font-light tracking-tight tabular-nums">
            {formatOutcomeDelta(outcome.id, deltas[outcome.id])}
          </dd>
          <dd className="text-xs text-muted-foreground">
            {betterOrWorse(outcome.id, deltas[outcome.id])}
          </dd>
        </div>
      ))}
    </dl>
  )
}
