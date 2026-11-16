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
import { plannerText } from "@/features/planner/planner-copy"
import {
  campaignName,
  formatOutcome,
  formatScore,
  POLICY_KIND_LABEL,
  POLICY_KIND_ORDER,
  sourcesById,
} from "@/features/planner/planner-format"
import { OUTCOMES } from "@/features/planner/planner-outcomes"
import { ResultSection } from "@/features/planner/result-section"
import { translate, useI18n } from "@/lib/i18n"

const AXIS_INSET_PCT = 4
const DOT_RADIUS = 5

function byKind(a: PolicyResult, b: PolicyResult): number {
  return POLICY_KIND_ORDER.indexOf(a.kind) - POLICY_KIND_ORDER.indexOf(b.kind)
}

function splitName(first: number, last: number): string {
  return translate("{value1} to {value2}", {
    value1: campaignName(first),
    value2: campaignName(last),
  })
}

/** The policy with the highest held-out mean score, in one sentence next to the optimum's. */
function takeaway(policies: ReadonlyArray<PolicyResult>): string | null {
  const optimal = policies.find((policy) => policy.kind === "optimal")
  const leader = policies.reduce<PolicyResult | null>(
    (best, policy) =>
      best === null || policy.test.mean_score > best.test.mean_score
        ? policy
        : best,
    null
  )
  if (!optimal || !leader) return null
  if (leader.policy_id === optimal.policy_id) {
    return translate(
      "The exact optimum has the highest held-out mean score: {value1}.",
      { value1: formatScore(optimal.test.mean_score) }
    )
  }
  return translate(
    "On the held-out campaigns {value1} has the highest mean score ({value2}); the exact optimum scores {value3}.",
    {
      value1: plannerText(leader.label),
      value2: formatScore(leader.test.mean_score),
      value3: formatScore(optimal.test.mean_score),
    }
  )
}

/** A policy that is only good on the campaigns it was fitted on (hollow) is overfitted. */
export function PolicyComparison({ result }: { result: RotationPlanResult }) {
  const { t } = useI18n("app")

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
  const summary = takeaway(policies)

  return (
    <ResultSection
      title={t("Policy comparison")}
      lead={t(
        "Mean score per campaign, unitless and higher is better, with the held-out campaigns in real units on the right."
      )}
      sources={sourcesById(result.sources, ["nasa-power", "magyp", "prices"])}
    >
      <div className="flex flex-col gap-6">
        {summary && <p className="text-sm">{summary}</p>}
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
              {t("Fitted campaigns,")}{" "}
              {splitName(reference.train.first_year, reference.train.last_year)}
            </li>
            <li className="flex items-center gap-1.5">
              <svg width="12" height="12" aria-hidden>
                <circle cx="6" cy="6" r="5" className="fill-primary" />
              </svg>
              {t("Held-out campaigns,")}{" "}
              {splitName(reference.test.first_year, reference.test.last_year)}
            </li>
          </ul>
        )}

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-44 min-w-40 align-bottom">
                {t("Policy")}
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
              <TableHead className="w-24 px-2 text-right align-bottom text-xs leading-tight whitespace-normal">
                {t("Bad-year margin")}
                <span className="block text-xs font-normal text-muted-foreground">
                  {t("USD/ha")}
                </span>
              </TableHead>
              {OUTCOMES.map((outcome) => (
                <TableHead
                  key={outcome.id}
                  className="w-20 px-2 text-right align-bottom text-xs leading-tight whitespace-normal"
                >
                  {t(outcome.label)}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {t(outcome.unit)}
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
                    <span className="font-medium">
                      {plannerText(policy.label)}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline">
                        {t(POLICY_KIND_LABEL[policy.kind])}
                      </Badge>
                      {policy.is_current && <Badge>{t("Current")}</Badge>}
                    </div>
                    {policy.note && (
                      <span className="text-xs text-muted-foreground">
                        {plannerText(policy.note)}
                      </span>
                    )}
                    {policy.sequence && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        {t("Cycle")}
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
                    aria-label={t(
                      "{value1}: mean score {value2} on fitted campaigns, {value3} on held-out campaigns",
                      {
                        value1: plannerText(policy.label),
                        value2: formatScore(policy.train.mean_score),
                        value3: formatScore(policy.test.mean_score),
                      }
                    )}
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
                    <span>
                      {t("fitted ")}
                      {formatScore(policy.train.mean_score)}
                    </span>
                    <span className="text-foreground">
                      {t("held-out ")}
                      {formatScore(policy.test.mean_score)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="px-2 text-right align-top tabular-nums">
                  <span className="inline-block py-1">
                    {formatOutcome(
                      "margin_usd_ha",
                      policy.test.lower_tail_margin_usd_ha
                    )}
                  </span>
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

        {reference && (
          <p className="text-xs text-muted-foreground">
            {t(
              "Outcome columns are mean per held-out campaign. Bad-year margin is the mean margin of the worst "
            )}
            {reference.test.lower_tail_campaigns} {t("of the ")}
            {reference.test.campaigns.length}{" "}
            {t(" held-out campaigns, a fifth of them rounded up.")}
          </p>
        )}

        {result.unavailable_strategies.length > 0 && (
          <div className="flex flex-col gap-2 border-t pt-6">
            <h3 className="text-sm font-medium">
              {t("Not scored for this region")}
            </h3>
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              {result.unavailable_strategies.map((strategy) => (
                <li key={strategy.strategy_id}>
                  <span className="text-foreground">
                    {plannerText(strategy.label)}
                  </span>
                  : {plannerText(strategy.reason)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ResultSection>
  )
}
