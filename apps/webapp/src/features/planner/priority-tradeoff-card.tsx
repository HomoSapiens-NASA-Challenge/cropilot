import type { OutcomeValues, RotationPlanResult } from "@cropilot/api"
import type { ReactNode } from "react"
import { ConclusionBadge } from "@/features/planner/conclusion-badge"
import { OutcomeDeltas } from "@/features/planner/outcome-deltas"
import {
  formatInterval,
  formatOutcome,
  formatOutcomeDelta,
  formatScore,
  sourcesById,
} from "@/features/planner/planner-format"
import { OUTCOMES } from "@/features/planner/planner-outcomes"
import {
  confidencePercent,
  heldOutAgainstKind,
  policyOfKind,
} from "@/features/planner/planner-results"
import { ResultSection } from "@/features/planner/result-section"

const LIST = new Intl.ListFormat("en", { style: "long", type: "conjunction" })

/** A change as words, from the amount (no sign) and whether the plan has more of it than margin only. */
const CHANGE_PHRASE = {
  margin_usd_ha: (amount, isMore) =>
    `${amount} USD/ha ${isMore ? "more" : "less"} gross margin`,
  deficit_mm: (amount, isMore) =>
    `${amount} mm ${isMore ? "more" : "less"} crop water deficit`,
  bare_days: (amount, isMore) =>
    `${amount} ${isMore ? "more" : "fewer"} days of bare soil`,
  bare_rain_mm: (amount, isMore) =>
    `${amount} mm ${isMore ? "more" : "less"} rain on bare soil`,
  drainage_mm: (amount, isMore) =>
    `${amount} mm ${isMore ? "more" : "less"} drainage`,
} as const satisfies Record<
  keyof OutcomeValues,
  (amount: string, isMore: boolean) => string
>

/** Only the changes that survive rounding, so the sentence never claims "0 mm less". */
function changeSentence(differences: OutcomeValues): string {
  const changes = OUTCOMES.flatMap((outcome) => {
    const delta = differences[outcome.id]
    const amount = formatOutcome(outcome.id, Math.abs(delta))
    return Number(amount) === 0
      ? []
      : [CHANGE_PHRASE[outcome.id](amount, delta > 0)]
  })
  if (changes.length === 0) {
    return "Your priorities and margin alone choose the same crops on the held-out campaigns, so nothing is traded."
  }
  return `Against planning for margin alone, your priorities bring ${LIST.format(changes)} per held-out campaign, on average.`
}

function Tile({
  label,
  figure,
  children,
}: {
  label: string
  figure: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border p-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-3xl font-light tracking-tight tabular-nums">
        {figure}
      </span>
      <p className="text-xs text-muted-foreground">{children}</p>
    </div>
  )
}

/**
 * What weighing the other four outcomes costs and buys: the exact optimum for the reader's
 * priorities against the optimum for margin alone, on the held-out campaigns and in real units.
 * It exists only when the priorities are not already margin only.
 */
export function PriorityTradeoffCard({
  result,
}: {
  result: RotationPlanResult
}) {
  const comparison = heldOutAgainstKind(result, "margin_only")
  const optimal = policyOfKind(result, "optimal")
  if (!comparison || !optimal) return null

  const percent = confidencePercent(result)
  const tail = optimal.test.lower_tail_campaigns

  return (
    <ResultSection
      title="What your priorities trade"
      lead="Your exact optimum against the exact optimum for gross margin alone, replayed on the held-out campaigns. Differences are yours minus margin only, in real units."
      aside={
        <span className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">In your score</span>
          <ConclusionBadge conclusion={comparison.conclusion} />
        </span>
      }
      sources={sourcesById(result.sources, [
        "nasa-power",
        "magyp",
        "prices",
        "costs",
      ])}
    >
      <p className="max-w-3xl text-sm">
        {changeSentence(comparison.outcome_differences)}
      </p>

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-medium">
          Your plan minus margin only, mean per held-out campaign
        </h3>
        <OutcomeDeltas deltas={comparison.outcome_differences} />
      </div>

      <div className="grid gap-4 border-t pt-6 sm:grid-cols-2">
        <Tile
          label="Score with your priorities"
          figure={formatScore(comparison.mean_score_difference)}
        >
          {`Mean per campaign, ${percent} interval ${formatInterval(
            comparison.interval_low,
            comparison.interval_high
          )}; your plan scores higher in ${comparison.campaigns_won} of ${comparison.campaigns} campaigns.`}
        </Tile>
        <Tile
          label="Bad-year margin"
          figure={formatOutcomeDelta(
            "margin_usd_ha",
            comparison.lower_tail_margin_difference_usd_ha
          )}
        >
          Mean margin of the worst {tail} of {comparison.campaigns} held-out
          campaigns, your plan minus margin only.
        </Tile>
      </div>
    </ResultSection>
  )
}
