import type { OutcomeValues, RotationPlanResult } from "@cropilot/api"
import {
  formatOutcomeDelta,
  formatScore,
  formatShare,
} from "@/features/planner/planner-format"
import { OUTCOMES } from "@/features/planner/planner-outcomes"

const TIE_TOLERANCE = 1e-9

/** The optimum is itself the best fixed rotation: no gap to report, in any split. */
function isFixedOptimum(result: RotationPlanResult): boolean {
  const { verdict } = result
  return (
    Math.abs(verdict.optimal_minus_best_fixed_expected) < TIE_TOLERANCE &&
    Math.abs(verdict.optimal_minus_best_fixed_train) < TIE_TOLERANCE &&
    Math.abs(verdict.optimal_minus_best_fixed_test) < TIE_TOLERANCE
  )
}

/**
 * The sentence is composed from the verdict numbers of the run: when the optimal policy does
 * not beat the best fixed rotation, it says so instead of rounding the gap into a win.
 */
function verdictSentence(result: RotationPlanResult): string {
  const { verdict, policies } = result
  const optimal = policies.find((policy) => policy.kind === "optimal")
  const bestFixed = policies.find(
    (policy) => policy.policy_id === verdict.best_fixed_policy_id
  )
  const fixedName = bestFixed
    ? `the best fixed rotation (${bestFixed.label})`
    : "the best fixed rotation"
  if (isFixedOptimum(result)) {
    return `With these priorities, the exact optimum is itself a fixed rotation: ${bestFixed?.label ?? "the best fixed rotation"}, every campaign. Reading El Niño or soil water does not change the choice.`
  }
  const fitted = optimal?.train.campaigns.length ?? 0
  const heldOut = verdict.test_campaigns
  const train = verdict.optimal_minus_best_fixed_train
  const test = verdict.optimal_minus_best_fixed_test
  const record = `won ${verdict.test_campaigns_won} of ${heldOut}`

  const trainPart =
    train > 0
      ? `beats ${fixedName} by ${formatScore(train)} per campaign in the ${fitted} campaigns it was fitted on`
      : `does not beat ${fixedName} in the ${fitted} campaigns it was fitted on (${formatScore(train)} per campaign)`

  let testPart: string
  if (test > 0) {
    testPart =
      train > 0
        ? `, and by ${formatScore(test)} on the ${heldOut} held-out campaigns (${record}).`
        : `. On the ${heldOut} held-out campaigns it beats it by ${formatScore(test)} per campaign (${record}).`
  } else {
    testPart =
      train > 0
        ? `, but it does not beat it on the ${heldOut} held-out campaigns (${formatScore(test)} per campaign; ${record}).`
        : `. It does not beat it on the ${heldOut} held-out campaigns either (${formatScore(test)} per campaign; ${record}).`
  }

  return `With these priorities, the exact optimal policy ${trainPart}${testPart}`
}

function betterOrWorse(
  id: keyof OutcomeValues,
  delta: number
): "better" | "worse" | "the same" {
  if (delta === 0) return "the same"
  const isHigherBetter = id === "margin_usd_ha"
  return delta > 0 === isHigherBetter ? "better" : "worse"
}

/** The headline of a finished run: how the optimal policy fares against the best fixed rotation. */
export function VerdictBlock({ result }: { result: RotationPlanResult }) {
  const { verdict } = result
  const heldOutDelta = verdict.optimal_minus_best_fixed_test_outcomes

  return (
    <section
      aria-label="Verdict"
      className="flex flex-col gap-6 rounded-xl border bg-card p-4 sm:p-6"
    >
      <p className="max-w-4xl text-xl/8 font-light tracking-tight text-balance sm:text-2xl/9">
        {verdictSentence(result)}
      </p>

      {!isFixedOptimum(result) && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">
            On the held-out campaigns, optimal minus best fixed, mean per
            campaign
          </h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
            {OUTCOMES.map((outcome) => (
              <div key={outcome.id} className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">
                  {outcome.label}
                </dt>
                <dd className="text-lg font-light tracking-tight tabular-nums">
                  {formatOutcomeDelta(outcome.id, heldOutDelta[outcome.id])}
                </dd>
                <dd className="text-xs text-muted-foreground">
                  {betterOrWorse(outcome.id, heldOutDelta[outcome.id])}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <p className="max-w-3xl border-t pt-4 text-sm text-muted-foreground">
        The learning agent (agent 1) picks the optimal action in{" "}
        <span className="tabular-nums text-foreground">
          {formatShare(verdict.agent_agreement_share)}
        </span>{" "}
        of the states, and its expected score differs from the optimum by{" "}
        <span className="tabular-nums text-foreground">
          {formatScore(verdict.agent_minus_optimal_expected)}
        </span>{" "}
        per campaign. The best fixed rotation was chosen on the fitted campaigns
        only.
      </p>
    </section>
  )
}
