import type { RotationPlanResult } from "@cropilot/api"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { plannerText } from "@/features/planner/planner-copy"
import {
  campaignName,
  ENSO_LABEL,
  ENSO_ORDER,
  formatOutcomeWithUnit,
  formatShare,
  formatWhole,
  sourcesById,
} from "@/features/planner/planner-format"
import { OUTCOMES } from "@/features/planner/planner-outcomes"
import { policyOfKind } from "@/features/planner/planner-results"
import { ResultSection } from "@/features/planner/result-section"
import { translate, useI18n } from "@/lib/i18n"

const EXPLANATIONS = [
  {
    term: "Decision process (MDP)",
    text: "A simplified map of the choices on a farm. Each state is what is known when deciding, such as the soil water and the El Niño phase, and in August also the winter crop. Each action is a crop, or fallow, for the coming season. What every action earns comes from the simulator, run on real weather.",
  },
  {
    term: "Exact solver",
    text: "Backward induction. It starts from the last campaign of the horizon, finds the best action in every state, and works back to the first. The map is small enough to check every option, so its answer is the true optimum of the map, not an approximation.",
  },
  {
    term: "Q-learning agent",
    text: "A learner that never sees the map. It plays thousands of simulated campaigns, tries actions and keeps a running estimate of how good each one is. Because the true optimum is known, the convergence chart shows how close learning gets to it, and the decision map shows where it still chooses differently.",
  },
  {
    term: "One campaign at a time",
    text: "The same solver with a horizon of one campaign, applied every campaign. Comparing the optimum with it shows whether planning ahead pays. At a horizon of one campaign the two are the same, so it is left out.",
  },
] as const

const JUDGING_RULE = [
  {
    term: "Better",
    text: "the whole interval is above zero.",
  },
  {
    term: "Worse",
    text: "the whole interval is below zero.",
  },
  {
    term: "Inconclusive",
    text: "the interval contains zero.",
  },
  {
    term: "Identical",
    text: "every campaign scores the same under both policies.",
  },
] as const

function percentile(fraction: number): string {
  return `${Number((fraction * 100).toFixed(1))}th`
}

/** What the planner does in plain words, how comparisons are judged, what it assumes, and its sources. */
export function MethodBlock({ result }: { result: RotationPlanResult }) {
  const { t } = useI18n("app")

  const optimal = policyOfKind(result, "optimal")
  const fitted = optimal
    ? translate("{value1} to {value2}", {
        value1: campaignName(optimal.train.first_year),
        value2: campaignName(optimal.train.last_year),
      })
    : "the fitted campaigns"
  const heldOut = optimal
    ? translate("{value1} to {value2}", {
        value1: campaignName(optimal.test.first_year),
        value2: campaignName(optimal.test.last_year),
      })
    : "the held-out campaigns"
  const { bootstrap } = result
  const lowerFraction = (1 - bootstrap.confidence) / 2
  const heldOutCampaigns = optimal?.test.campaigns.length ?? 0
  const tailCampaigns = optimal?.test.lower_tail_campaigns ?? 0
  const transitionCount = (june: string, august: string) =>
    result.enso_transitions.find(
      (row) => row.enso_june === june && row.enso_august === august
    )?.training_campaigns ?? 0

  return (
    <div className="flex flex-col gap-6">
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <ResultSection
          title={t("How it is computed")}
          lead={t("From simulated campaigns to a plan, in four ideas.")}
        >
          <dl className="flex flex-col gap-5">
            {EXPLANATIONS.map((item) => (
              <div key={item.term} className="flex flex-col gap-1">
                <dt className="text-sm font-medium">{t(item.term)}</dt>
                <dd className="text-sm text-muted-foreground">
                  {t(item.text)}
                </dd>
              </div>
            ))}
          </dl>
        </ResultSection>

        <ResultSection
          title={t("How comparisons are judged")}
          lead={t(
            "Every held-out gap is the optimum minus one baseline, campaign by campaign, with a {value1}% interval.",
            { value1: Math.round(bootstrap.confidence * 100) }
          )}
        >
          <div className="flex flex-col gap-5 text-sm text-muted-foreground">
            <p>
              {t("The ")}
              {heldOutCampaigns} {t(" held-out campaigns are cut into")}{" "}
              {bootstrap.blocks} {t(" blocks of ")}
              {bootstrap.block_campaigns}{" "}
              {t(
                " in a row. The gap is recomputed for every ordered way to draw"
              )}{" "}
              {bootstrap.blocks} {t(" blocks with replacement:")}{" "}
              <span className="tabular-nums text-foreground">
                {formatWhole(bootstrap.resamples)}
              </span>{" "}
              {t("resamples, with no random draws. The interval runs from the")}{" "}
              {percentile(lowerFraction)} {t(" to the ")}
              {percentile(1 - lowerFraction)} {t("percentile of their means.")}
            </p>
            <dl className="flex flex-col gap-1.5">
              {JUDGING_RULE.map((item) => (
                <div key={item.term} className="flex gap-2">
                  <dt className="w-24 shrink-0 font-medium text-foreground">
                    {t(item.term)}
                  </dt>
                  <dd>{t(item.text)}</dd>
                </div>
              ))}
            </dl>
            <p>
              {t(
                "Few blocks give a coarse interval, so Better needs nearly every block to agree. Consecutive campaigns carry soil water into the next, so the blocks are not independent restarts. Read the conclusion as a guide, not as a test with a guaranteed error rate."
              )}
            </p>
            <p>
              <span className="font-medium text-foreground">
                {t("Bad-year margin")}
              </span>{" "}
              {t("is the mean gross margin, in USD/ha, of the worst ")}
              {tailCampaigns} {t("of the ")}
              {heldOutCampaigns}{" "}
              {t(
                " held-out campaigns: a fifth of them, rounded up. It is reported per policy and is not one of your priorities."
              )}
            </p>
          </div>
        </ResultSection>

        <ResultSection
          title={t("How the score is built")}
          lead={t(
            "Each outcome is divided by its standard deviation across the fitted campaigns, so dollars and millimetres can be added."
          )}
        >
          <p className="text-sm text-muted-foreground">
            {t(
              "Margin counts up and the other four count down, each times its share of your priorities. A score has no unit: it ranks policies, and the real units are always shown beside it."
            )}
          </p>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("Outcome")}</TableHead>
                <TableHead className="text-right">{t("Share")}</TableHead>
                <TableHead className="text-right">{t("Scale")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {OUTCOMES.map((outcome) => (
                <TableRow key={outcome.id}>
                  <TableCell>{t(outcome.label)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatShare(result.weights[outcome.id])}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatOutcomeWithUnit(
                      outcome.id,
                      result.outcome_scales[outcome.id]
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground">
            {t(
              "Share is the part of your priorities an outcome carries. Scale is one standard deviation of that outcome across the fitted campaigns."
            )}
          </p>
        </ResultSection>

        <ResultSection
          title={t("Assumptions and limits")}
          lead={t("What the plan takes as given.")}
          sources={sourcesById(result.sources, ["noaa-oni"])}
        >
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-muted-foreground">
            <li>
              {t("The decision process is built from the ")}
              {fitted}{" "}
              {t(
                " campaigns, and every policy is judged again on the held-out "
              )}
              {heldOut}{" "}
              {t(
                " campaigns. The best fixed rotation is chosen on the fitted campaigns only."
              )}
            </li>
            <li>
              {t("The August decision does not see the August soil water.")}
            </li>
            <li>
              {t(
                "Weather years are drawn within the El Niño phase of the decision: the planner does not forecast a particular year."
              )}
            </li>
            <li>
              {t("Soil water is read at ")}
              {formatWhole(result.water_levels)} {t(" levels of a ")}
              {formatWhole(result.soil_capacity_mm)}{" "}
              {t(" mm capacity, and the agent trained for ")}
              {formatWhole(result.episodes)} {t(" episodes.")}
            </li>
          </ul>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">
              {t("El Niño phases in the fitted campaigns")}
            </h3>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("June \\ August")}</TableHead>
                  {ENSO_ORDER.map((august) => (
                    <TableHead key={august} className="text-right">
                      {t(ENSO_LABEL[august])}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ENSO_ORDER.map((june) => (
                  <TableRow key={june}>
                    <TableCell>{t(ENSO_LABEL[june])}</TableCell>
                    {ENSO_ORDER.map((august) => (
                      <TableCell
                        key={august}
                        className="text-right tabular-nums"
                      >
                        {transitionCount(june, august)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground">
              {t(
                "Campaigns of the fitted period, counted by the phase on June 1 (rows) and the phase at the end of August (columns)."
              )}
            </p>
          </div>
        </ResultSection>
      </div>

      <ResultSection
        title={t("Sources")}
        lead={t("Every number in the planner comes from one of these.")}
      >
        <ul className="grid gap-4 md:grid-cols-2">
          {result.sources.map((source) => (
            <li
              key={source.source_id}
              className="flex flex-col gap-0.5 rounded-lg border p-4 text-sm"
            >
              <span className="font-medium">{t(source.dataset)}</span>
              <span className="text-muted-foreground">
                {t(source.provider)}. {t(source.period)}. {t(source.location)}.
              </span>
              <span className="text-xs text-muted-foreground">
                {t("Used for: ")}
                {plannerText(source.used_for)}
              </span>
            </li>
          ))}
        </ul>
      </ResultSection>

      <p className="text-sm font-medium">
        {t(
          "Simulated scenarios, not a recommendation. They support the agronomist's judgment; they do not replace it."
        )}
      </p>
    </div>
  )
}
