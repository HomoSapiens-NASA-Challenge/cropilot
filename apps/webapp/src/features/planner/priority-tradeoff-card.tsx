import type { OutcomeValues, RotationPlanResult } from "@cropilot/api"
import type { ReactNode } from "react"
import { ConclusionBadge } from "@/features/planner/conclusion-badge"
import { OutcomeDeltas } from "@/features/planner/outcome-deltas"
import {
  formatInterval,
  formatOutcome,
  formatOutcomeDelta,
  formatPlannerList,
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
import { translate, useI18n } from "@/lib/i18n"

/** A change as words, from the amount (no sign) and whether the plan has more of it than margin only. */
const CHANGE_PHRASE = {
  margin_usd_ha: (amount, isMore) =>
    translate("{amount} USD/ha {direction} gross margin", {
      amount,
      direction: translate(isMore ? "more" : "less"),
    }),
  deficit_mm: (amount, isMore) =>
    translate("{value1} mm {value2} crop water deficit", {
      value1: amount,
      value2: translate(isMore ? "more" : "less"),
    }),
  bare_days: (amount, isMore) =>
    translate("{value1} {value2} days of bare soil", {
      value1: amount,
      value2: translate(isMore ? "more" : "fewer"),
    }),
  bare_rain_mm: (amount, isMore) =>
    translate("{value1} mm {value2} rain on bare soil", {
      value1: amount,
      value2: translate(isMore ? "more" : "less"),
    }),
  drainage_mm: (amount, isMore) =>
    translate("{value1} mm {value2} drainage", {
      value1: amount,
      value2: translate(isMore ? "more" : "less"),
    }),
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
    return translate(
      "Your priorities and margin alone choose the same crops on the held-out campaigns, so nothing is traded."
    )
  }
  return translate(
    "Against planning for margin alone, your priorities bring {value1} per held-out campaign, on average.",
    { value1: formatPlannerList(changes) }
  )
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
  const { t } = useI18n("app")

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border p-4">
      <span className="text-xs text-muted-foreground">{t(label)}</span>
      <span className="text-3xl font-light tracking-tight tabular-nums">
        {figure}
      </span>
      <p className="text-xs text-muted-foreground">{children}</p>
    </div>
  )
}

/** Exists only when the priorities are not already margin only. */
export function PriorityTradeoffCard({
  result,
}: {
  result: RotationPlanResult
}) {
  const { t } = useI18n("app")

  const comparison = heldOutAgainstKind(result, "margin_only")
  const optimal = policyOfKind(result, "optimal")
  if (!comparison || !optimal) return null

  const percent = confidencePercent(result)
  const tail = optimal.test.lower_tail_campaigns

  return (
    <ResultSection
      title={t("What your priorities trade")}
      lead={t(
        "Your exact optimum against the exact optimum for gross margin alone, replayed on the held-out campaigns. Differences are yours minus margin only, in real units."
      )}
      aside={
        <span className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {t("In your score")}
          </span>
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
          {t("Your plan minus margin only, mean per held-out campaign")}
        </h3>
        <OutcomeDeltas deltas={comparison.outcome_differences} />
      </div>

      <div className="grid gap-4 border-t pt-6 sm:grid-cols-2">
        <Tile
          label={t("Score with your priorities")}
          figure={formatScore(comparison.mean_score_difference)}
        >
          {t(
            "Mean per campaign, {value1} interval {value2}; your plan scores higher in {value3} of {value4} campaigns.",
            {
              value1: percent,
              value2: formatInterval(
                comparison.interval_low,
                comparison.interval_high
              ),
              value3: comparison.campaigns_won,
              value4: comparison.campaigns,
            }
          )}
        </Tile>
        <Tile
          label={t("Bad-year margin")}
          figure={formatOutcomeDelta(
            "margin_usd_ha",
            comparison.lower_tail_margin_difference_usd_ha
          )}
        >
          {t("Mean margin of the worst ")}
          {tail} {t(" of ")}
          {comparison.campaigns}{" "}
          {t(" held-out campaigns, your plan minus margin only.")}
        </Tile>
      </div>
    </ResultSection>
  )
}
