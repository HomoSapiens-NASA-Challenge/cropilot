import type {
  HeldOutComparison,
  PolicyResult,
  RotationPlanResult,
} from "@cropilot/api"
import { Badge } from "@/components/ui/badge"
import { niceTicks, paddedDomain } from "@/features/planner/chart-scale"
import { ConclusionBadge } from "@/features/planner/conclusion-badge"
import { plannerText } from "@/features/planner/planner-copy"
import {
  CONCLUSION_LABEL,
  formatInterval,
  formatPlannerList,
  formatScore,
  sourcesById,
} from "@/features/planner/planner-format"
import { confidencePercent } from "@/features/planner/planner-results"
import type { Conclusion } from "@/features/planner/planner-types"
import { ResultSection } from "@/features/planner/result-section"
import { translate, useI18n } from "@/lib/i18n"

const AXIS_INSET_PCT = 4
const ROW_HEIGHT_PX = 32
const AXIS_HEIGHT_PX = 20
const DOT_RADIUS = 5
const CAP_HALF_HEIGHT_PX = 5
// Shared by the rows and the axis, so every plot column has the same width and scale.
const GRID_COLUMNS = "sm:grid-cols-[13rem_minmax(0,1fr)_8.5rem]"

const CONCLUSION_PHRASE = {
  better: (count) => translate("better than {count}", { count }),
  inconclusive: (count) =>
    translate("not clearly different from {value1}", { value1: count }),
  identical: (count) => translate("identical to {value1}", { value1: count }),
  worse: (count) => translate("worse than {count}", { count }),
} as const satisfies Record<Conclusion, (count: number) => string>

const CONCLUSION_SEQUENCE = [
  "better",
  "inconclusive",
  "identical",
  "worse",
] as const satisfies ReadonlyArray<Conclusion>

type Row = { comparison: HeldOutComparison; baseline: PolicyResult }

/** One row per baseline the optimum is judged against. The agent is the optimum's copy: it has its own tile. */
function rowsOf(result: RotationPlanResult): Row[] {
  return result.verdict.held_out.flatMap((comparison) => {
    const baseline = result.policies.find(
      (policy) => policy.policy_id === comparison.baseline_policy_id
    )
    return baseline && baseline.kind !== "agent"
      ? [{ comparison, baseline }]
      : []
  })
}

/** The takeaway is counted from the conclusions, so it cannot disagree with the rows. */
function takeaway(rows: ReadonlyArray<Row>): string {
  const phrases = CONCLUSION_SEQUENCE.flatMap((conclusion) => {
    const count = rows.filter(
      (row) => row.comparison.conclusion === conclusion
    ).length
    return count > 0 ? [CONCLUSION_PHRASE[conclusion](count)] : []
  })
  return translate(
    "Of the {value1} baselines shown, the exact optimum is {value2} on the held-out campaigns.",
    { value1: rows.length, value2: formatPlannerList(phrases) }
  )
}

/**
 * Forest plot of the held-out comparison: for each baseline, the exact optimum's mean score
 * minus the baseline's on the same campaigns, with the interval of that mean. A whisker that
 * crosses the dashed zero line means the data cannot tell the two apart.
 */
export function HeldOutChart({ result }: { result: RotationPlanResult }) {
  const { t } = useI18n("app")

  const rows = rowsOf(result)
  const first = rows[0]
  if (!first) return null

  const percent = confidencePercent(result)
  const { bootstrap } = result
  const [domainMin, domainMax] = paddedDomain([
    0,
    ...rows.flatMap(({ comparison }) => [
      comparison.interval_low,
      comparison.interval_high,
      comparison.mean_score_difference,
    ]),
  ])
  const positionOf = (score: number) =>
    AXIS_INSET_PCT +
    ((score - domainMin) / (domainMax - domainMin)) * (100 - 2 * AXIS_INSET_PCT)
  const ticks = niceTicks(domainMin, domainMax, 5)
  const middle = ROW_HEIGHT_PX / 2

  return (
    <ResultSection
      title={t("Held-out comparison")}
      lead={t(
        "The exact optimum minus each baseline, on the same {value1} held-out campaigns. Right of the dashed line the optimum scores higher; left of it, the baseline does.",
        { value1: first.comparison.campaigns }
      )}
      sources={sourcesById(result.sources, ["nasa-power", "noaa-oni"])}
    >
      <p className="max-w-3xl text-sm">{takeaway(rows)}</p>

      <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <svg width="12" height="12" aria-hidden>
            <circle cx="6" cy="6" r="5" className="fill-primary" />
          </svg>
          {t("Mean difference per campaign")}
        </li>
        <li className="flex items-center gap-1.5">
          <svg width="26" height="12" aria-hidden>
            <line
              x1="1"
              x2="25"
              y1="6"
              y2="6"
              className="stroke-muted-foreground"
              strokeWidth={2}
            />
            <line
              x1="1"
              x2="1"
              y1="1"
              y2="11"
              className="stroke-muted-foreground"
            />
            <line
              x1="25"
              x2="25"
              y1="1"
              y2="11"
              className="stroke-muted-foreground"
            />
          </svg>
          {percent} {t(" interval of that mean")}
        </li>
        <li className="flex items-center gap-1.5">
          <svg width="12" height="12" aria-hidden>
            <line
              x1="6"
              x2="6"
              y1="0"
              y2="12"
              className="stroke-foreground"
              strokeDasharray="3 3"
            />
          </svg>
          {t("No difference")}
        </li>
      </ul>

      <div className="flex flex-col">
        <ul className="flex flex-col">
          {rows.map(({ comparison, baseline }) => (
            <li
              key={comparison.baseline_policy_id}
              className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b py-3 ${GRID_COLUMNS}`}
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
                  {plannerText(baseline.label)}
                  {baseline.is_current && <Badge>{t("Current")}</Badge>}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatScore(comparison.mean_score_difference)}, {percent}{" "}
                  {t("interval")}{" "}
                  {formatInterval(
                    comparison.interval_low,
                    comparison.interval_high
                  )}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1 sm:col-start-3 sm:row-start-1">
                <ConclusionBadge conclusion={comparison.conclusion} />
                <span className="text-xs text-muted-foreground tabular-nums">
                  {t("won ")}
                  {comparison.campaigns_won} {t(" of ")}
                  {comparison.campaigns}
                </span>
              </div>
              <svg
                height={ROW_HEIGHT_PX}
                className="col-span-2 block w-full sm:col-span-1 sm:col-start-2 sm:row-start-1"
                role="img"
                aria-label={t(
                  "Optimum minus {value1}: {value2} per campaign, {value3} interval {value4}, {value5}",
                  {
                    value1: plannerText(baseline.label),
                    value2: formatScore(comparison.mean_score_difference),
                    value3: percent,
                    value4: formatInterval(
                      comparison.interval_low,
                      comparison.interval_high
                    ),
                    value5: t(
                      CONCLUSION_LABEL[comparison.conclusion]
                    ).toLowerCase(),
                  }
                )}
              >
                {ticks
                  .filter((tick) => tick !== 0)
                  .map((tick) => (
                    <line
                      key={tick}
                      x1={`${positionOf(tick)}%`}
                      x2={`${positionOf(tick)}%`}
                      y1="0"
                      y2={ROW_HEIGHT_PX}
                      className="stroke-border"
                    />
                  ))}
                <line
                  x1={`${positionOf(0)}%`}
                  x2={`${positionOf(0)}%`}
                  y1="0"
                  y2={ROW_HEIGHT_PX}
                  className="stroke-foreground"
                  strokeDasharray="3 3"
                />
                {comparison.interval_high > comparison.interval_low && (
                  <>
                    <line
                      x1={`${positionOf(comparison.interval_low)}%`}
                      x2={`${positionOf(comparison.interval_high)}%`}
                      y1={middle}
                      y2={middle}
                      className="stroke-muted-foreground"
                      strokeWidth={2}
                    />
                    {[comparison.interval_low, comparison.interval_high].map(
                      (end) => (
                        <line
                          key={end}
                          x1={`${positionOf(end)}%`}
                          x2={`${positionOf(end)}%`}
                          y1={middle - CAP_HALF_HEIGHT_PX}
                          y2={middle + CAP_HALF_HEIGHT_PX}
                          className="stroke-muted-foreground"
                        />
                      )
                    )}
                  </>
                )}
                <circle
                  cx={`${positionOf(comparison.mean_score_difference)}%`}
                  cy={middle}
                  r={DOT_RADIUS}
                  className="fill-primary stroke-background"
                  strokeWidth={1}
                />
              </svg>
            </li>
          ))}
        </ul>
        <div className={`grid grid-cols-1 gap-x-4 pt-1 ${GRID_COLUMNS}`}>
          <svg
            height={AXIS_HEIGHT_PX}
            className="block w-full sm:col-start-2"
            aria-hidden
          >
            {ticks.map((tick) => (
              <text
                key={tick}
                x={`${positionOf(tick)}%`}
                y="13"
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={11}
              >
                {formatScore(tick)}
              </text>
            ))}
          </svg>
          <p className="text-xs text-muted-foreground sm:col-start-2">
            {t(
              "Score difference per campaign, unitless. The interval resamples"
            )}{" "}
            {bootstrap.blocks} {t(" blocks of ")}
            {bootstrap.block_campaigns}{" "}
            {t(" consecutive campaigns in every order (")}
            {bootstrap.resamples} {t(" resamples).")}
          </p>
        </div>
      </div>
    </ResultSection>
  )
}
