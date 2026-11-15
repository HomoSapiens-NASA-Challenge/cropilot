import type { PolicyResult, RotationPlanResult } from "@cropilot/api"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { niceTicks, paddedDomain } from "@/features/planner/chart-scale"
import {
  ItineraryChip,
  keyedItineraries,
} from "@/features/planner/itinerary-chip"
import {
  campaignName,
  formatOutcome,
  formatScore,
  POLICY_KIND_LABEL,
  POLICY_KIND_ORDER,
} from "@/features/planner/planner-format"
import { OUTCOMES } from "@/features/planner/planner-outcomes"
import { ResultSection } from "@/features/planner/result-section"

const AXIS_INSET_PCT = 4
const DOT_RADIUS = 5

function byKind(a: PolicyResult, b: PolicyResult): number {
  return POLICY_KIND_ORDER.indexOf(a.kind) - POLICY_KIND_ORDER.indexOf(b.kind)
}

function splitName(first: number, last: number): string {
  return `${campaignName(first)} to ${campaignName(last)}`
}

/**
 * Every policy on one axis: the mean score on the campaigns it was fitted on (hollow) and on
 * the held-out campaigns (filled). A policy that is only good on the first is overfitted.
 */
export function PolicyComparison({ result }: { result: RotationPlanResult }) {
  const policies = [...result.policies].sort(byKind)
  const reference = policies.find((policy) => policy.kind === "optimal")
  const [domainMin, domainMax] = paddedDomain(
    policies.flatMap((policy) => [
      policy.train.mean_score,
      policy.test.mean_score,
    ]),
    0.12
  )
  const positionOf = (score: number) =>
    AXIS_INSET_PCT +
    ((score - domainMin) / (domainMax - domainMin)) * (100 - 2 * AXIS_INSET_PCT)
  const ticks = niceTicks(domainMin, domainMax, 4)

  return (
    <ResultSection
      title="Policy comparison"
      lead="Mean score per campaign, unitless and higher is better, with the held-out campaigns in real units on the right."
    >
      <div className="flex flex-col gap-4">
        {reference && (
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <svg width="12" height="12" aria-hidden>
                <circle
                  cx="6"
                  cy="6"
                  r="4.5"
                  className="fill-background stroke-foreground"
                  strokeWidth={1.5}
                />
              </svg>
              Fitted campaigns,{" "}
              {splitName(reference.train.first_year, reference.train.last_year)}
            </li>
            <li className="flex items-center gap-1.5">
              <svg width="12" height="12" aria-hidden>
                <circle cx="6" cy="6" r="5" className="fill-primary" />
              </svg>
              Held-out campaigns,{" "}
              {splitName(reference.test.first_year, reference.test.last_year)}
            </li>
          </ul>
        )}

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-44 min-w-40 align-bottom">
                Policy
              </TableHead>
              <TableHead className="min-w-60 align-bottom">
                <svg height="18" aria-hidden className="block w-full">
                  {ticks.map((tick) => (
                    <text
                      key={tick}
                      x={`${positionOf(tick)}%`}
                      y="13"
                      textAnchor="middle"
                      className="fill-muted-foreground font-normal"
                      fontSize={11}
                    >
                      {formatScore(tick)}
                    </text>
                  ))}
                </svg>
              </TableHead>
              {OUTCOMES.map((outcome) => (
                <TableHead
                  key={outcome.id}
                  className="w-20 px-2 text-right align-bottom text-xs leading-tight whitespace-normal"
                >
                  {outcome.label}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {outcome.unit}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.map((policy) => (
              <TableRow key={policy.policy_id}>
                <TableCell className="align-top whitespace-normal">
                  <div className="flex flex-col gap-1.5 py-1">
                    <span className="font-medium">{policy.label}</span>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline">
                        {POLICY_KIND_LABEL[policy.kind]}
                      </Badge>
                      {policy.is_current && <Badge>Current</Badge>}
                    </div>
                    {policy.note && (
                      <span className="text-xs text-muted-foreground">
                        {policy.note}
                      </span>
                    )}
                    {policy.sequence && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        Cycle
                        {keyedItineraries(policy.sequence).map((step) => (
                          <ItineraryChip
                            key={step.key}
                            itinerary={step.itinerary}
                            className="w-6"
                          />
                        ))}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="min-w-60">
                  <svg
                    height="40"
                    className="block w-full"
                    role="img"
                    aria-label={`${policy.label}: mean score ${formatScore(policy.train.mean_score)} on fitted campaigns, ${formatScore(policy.test.mean_score)} on held-out campaigns`}
                  >
                    {ticks.map((tick) => (
                      <line
                        key={tick}
                        x1={`${positionOf(tick)}%`}
                        x2={`${positionOf(tick)}%`}
                        y1="0"
                        y2="40"
                        className={
                          tick === 0
                            ? "stroke-muted-foreground"
                            : "stroke-border"
                        }
                      />
                    ))}
                    <line
                      x1={`${positionOf(policy.train.mean_score)}%`}
                      x2={`${positionOf(policy.test.mean_score)}%`}
                      y1="20"
                      y2="20"
                      className="stroke-foreground"
                      strokeWidth={1.5}
                    />
                    <circle
                      cx={`${positionOf(policy.train.mean_score)}%`}
                      cy="20"
                      r={DOT_RADIUS}
                      className="fill-background stroke-foreground"
                      strokeWidth={1.5}
                    />
                    <circle
                      cx={`${positionOf(policy.test.mean_score)}%`}
                      cy="20"
                      r={DOT_RADIUS}
                      className="fill-primary stroke-background"
                      strokeWidth={1}
                    />
                  </svg>
                  <div className="flex justify-between gap-3 text-xs tabular-nums text-muted-foreground">
                    <span>fitted {formatScore(policy.train.mean_score)}</span>
                    <span className="text-foreground">
                      held-out {formatScore(policy.test.mean_score)}
                    </span>
                  </div>
                </TableCell>
                {OUTCOMES.map((outcome) => (
                  <TableCell
                    key={outcome.id}
                    className="px-2 text-right align-top tabular-nums"
                  >
                    <span className="inline-block py-1">
                      {formatOutcome(
                        outcome.id,
                        policy.test.mean_outcomes[outcome.id]
                      )}
                    </span>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {result.unavailable_strategies.length > 0 && (
          <div className="flex flex-col gap-2 border-t pt-4">
            <h3 className="text-sm font-medium">Not scored for this region</h3>
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              {result.unavailable_strategies.map((strategy) => (
                <li key={strategy.strategy_id}>
                  <span className="text-foreground">{strategy.label}</span>:{" "}
                  {strategy.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ResultSection>
  )
}
