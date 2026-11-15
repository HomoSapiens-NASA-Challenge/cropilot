import type {
  HeldOutComparison,
  PolicyResult,
  RotationPlanResult,
} from "@cropilot/api"
import type { PolicyKind } from "@/features/planner/planner-types"

/** The first policy of a kind. `optimal`, `agent`, `myopic`, `margin_only` and `best_fixed` have one. */
export function policyOfKind(
  result: RotationPlanResult,
  kind: PolicyKind
): PolicyResult | undefined {
  return result.policies.find((policy) => policy.kind === kind)
}

/** The held-out comparison of the optimum against one baseline policy. */
export function heldOutAgainst(
  result: RotationPlanResult,
  baselinePolicyId: string
): HeldOutComparison | undefined {
  return result.verdict.held_out.find(
    (comparison) => comparison.baseline_policy_id === baselinePolicyId
  )
}

/** The held-out comparison of the optimum against the policy of a kind, if the run has one. */
export function heldOutAgainstKind(
  result: RotationPlanResult,
  kind: PolicyKind
): HeldOutComparison | undefined {
  const baseline = policyOfKind(result, kind)
  return baseline ? heldOutAgainst(result, baseline.policy_id) : undefined
}

/** "95%" from the confidence level of the run's bootstrap. */
export function confidencePercent(result: RotationPlanResult): string {
  return `${Math.round(result.bootstrap.confidence * 100)}%`
}
