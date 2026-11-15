import type { HeldOutComparison, RotationPlanResult } from "@cropilot/api"
import type { ReactNode } from "react"
import { ConclusionBadge } from "@/features/planner/conclusion-badge"
import { OutcomeDeltas } from "@/features/planner/outcome-deltas"
import {
  campaignName,
  formatInterval,
  formatScore,
  formatShare,
  sourcesById,
} from "@/features/planner/planner-format"
import {
  confidencePercent,
  heldOutAgainst,
  heldOutAgainstKind,
  policyOfKind,
} from "@/features/planner/planner-results"
import { ResultSection } from "@/features/planner/result-section"

const HEADLINE_VERB = {
  better: "beats",
  worse: "scores below",
  inconclusive: "cannot be told apart from",
} as const

/**
 * The sentence is composed from the held-out comparison of the run: when the optimum is not
 * clearly better than the best fixed rotation, it says so instead of rounding the gap into a win.
 */
function verdictSentence(
  result: RotationPlanResult,
  versusFixed: HeldOutComparison,
  fixedLabel: string
): string {
  const fixedName = `the best fixed rotation (${fixedLabel})`
  if (versusFixed.conclusion === "identical") {
    return `With these priorities, the exact optimum is itself a fixed rotation: ${fixedLabel}, every campaign. Reading El Niño or soil water does not change the choice.`
  }
  const verb = HEADLINE_VERB[versusFixed.conclusion]
  const interval = `${confidencePercent(result)} interval ${formatInterval(versusFixed.interval_low, versusFixed.interval_high)}`
  return `On the ${versusFixed.campaigns} held-out campaigns, the exact optimum ${verb} ${fixedName}: ${formatScore(versusFixed.mean_score_difference)} per campaign (${interval}), better in ${versusFixed.campaigns_won} of ${versusFixed.campaigns}.`
}

function Tile({
  label,
  badge,
  figure,
  children,
}: {
  label: string
  badge?: ReactNode
  figure: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border p-4">
      <div className="flex min-h-5 flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        {badge}
      </div>
      <span className="text-3xl font-light tracking-tight tabular-nums">
        {figure}
      </span>
      <p className="text-xs text-muted-foreground">{children}</p>
    </div>
  )
}

/** The headline of a finished run: how the optimum fares on the held-out campaigns, in four tiles. */
export function VerdictBlock({ result }: { result: RotationPlanResult }) {
  const { verdict } = result
  const optimal = policyOfKind(result, "optimal")
  const bestFixed = result.policies.find(
    (policy) => policy.policy_id === verdict.best_fixed_policy_id
  )
  const versusFixed = heldOutAgainst(result, verdict.best_fixed_policy_id)
  if (!optimal || !bestFixed || !versusFixed) {
    throw new Error("The run has no optimum or no held-out best fixed rotation")
  }
  const versusMyopic = heldOutAgainstKind(result, "myopic")
  const percent = confidencePercent(result)
  const fitted = optimal.train.campaigns.length
  const heldOut = `${campaignName(optimal.test.first_year)} to ${campaignName(optimal.test.last_year)}`

  return (
    <ResultSection
      title="Verdict"
      lead={`Held-out campaigns ${heldOut}: never used to fit the plan or to choose the best fixed rotation.`}
      aside={
        <span className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Against best fixed
          </span>
          <ConclusionBadge conclusion={versusFixed.conclusion} />
        </span>
      }
      sources={sourcesById(result.sources, ["nasa-power", "noaa-oni"])}
    >
      <p className="max-w-4xl text-xl/8 font-light tracking-tight text-balance sm:text-2xl/9">
        {verdictSentence(result, versusFixed, bestFixed.label)}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Optimum minus best fixed"
          figure={formatScore(versusFixed.mean_score_difference)}
        >
          Mean score per campaign, {percent} interval{" "}
          {formatInterval(versusFixed.interval_low, versusFixed.interval_high)}.
        </Tile>
        <Tile
          label="Campaigns won"
          figure={`${versusFixed.campaigns_won} of ${versusFixed.campaigns}`}
        >
          Held-out campaigns where the optimum scores strictly above the best
          fixed rotation.
        </Tile>
        {versusMyopic ? (
          <Tile
            label="Planning ahead"
            badge={<ConclusionBadge conclusion={versusMyopic.conclusion} />}
            figure={formatScore(versusMyopic.mean_score_difference)}
          >
            Optimum minus one campaign at a time, {percent} interval{" "}
            {formatInterval(
              versusMyopic.interval_low,
              versusMyopic.interval_high
            )}
            .
          </Tile>
        ) : (
          <Tile label="Planning ahead" figure="n/a">
            With one campaign planned ahead the optimum already plans one
            campaign at a time. Plan two or more to compare.
          </Tile>
        )}
        <Tile
          label="Agent versus optimum"
          figure={formatShare(verdict.agent_agreement_share)}
        >
          Of the states where the learning agent picks the optimal action. Its
          expected score differs from the optimum by{" "}
          {formatScore(verdict.agent_minus_optimal_expected)} per campaign.
        </Tile>
      </div>

      {versusFixed.conclusion !== "identical" && (
        <div className="flex flex-col gap-4 border-t pt-6">
          <h3 className="text-sm font-medium">
            In real units: optimum minus best fixed, mean per held-out campaign
          </h3>
          <OutcomeDeltas deltas={versusFixed.outcome_differences} />
        </div>
      )}

      <div className="border-t pt-6">
        <p className="max-w-3xl text-xs text-muted-foreground">
          On the {fitted} fitted campaigns the optimum minus the best fixed
          rotation was {formatScore(verdict.optimal_minus_best_fixed_train)} per
          campaign. The best fixed rotation was chosen on those campaigns only.
        </p>
      </div>
    </ResultSection>
  )
}
