import type {
  CampaignReplay,
  PolicyResult,
  RotationPlanResult,
} from "@cropilot/api"
import { cn } from "cn"
import { useState } from "react"
import {
  linePath,
  niceTicks,
  paddedDomain,
} from "@/features/planner/chart-scale"
import { ItineraryChip } from "@/features/planner/itinerary-chip"
import { plannerText } from "@/features/planner/planner-copy"
import {
  campaignName,
  campaignShortName,
  ENSO_LABEL,
  formatScore,
  itineraryLabel,
  POLICY_KIND_LABEL,
  sourcesById,
} from "@/features/planner/planner-format"
import type { EnsoPhase } from "@/features/planner/planner-types"
import { ResultSection } from "@/features/planner/result-section"
import { useElementWidth } from "@/hooks/use-element-width"
import { translate, useI18n } from "@/lib/i18n"

const LABEL_COLUMN = "13rem"
const CAMPAIGN_COLUMN_MIN = "2.75rem"
const BAR_HEIGHT_PX = 36

const ENSO_SHORT = {
  la_nina: "Niña",
  neutral: "Neutral",
  el_nino: "Niño",
} as const satisfies Record<EnsoPhase, string>

const ENSO_TONE = {
  la_nina: "bg-foreground/10 text-foreground",
  neutral: "bg-muted text-muted-foreground",
  el_nino: "bg-primary/10 text-primary",
} as const satisfies Record<EnsoPhase, string>

// Dashes tell the lines apart at rest, when none of them is highlighted.
const LINE_DASHES = [
  undefined,
  "6 3",
  "2 3",
  "8 3 2 3",
  "10 3 2 3 2 3",
] as const

const CHART_MARGIN = { top: 12, right: 200, bottom: 28, left: 52 } as const
const CHART_HEIGHT_PX = 240
const MIN_CHART_WIDTH_PX = 420
const END_LABEL_GAP_PX = 13
const END_LABEL_MAX_CHARS = 24

type Row = {
  policy: PolicyResult
  campaigns: ReadonlyArray<CampaignReplay>
  cumulative: ReadonlyArray<number>
}

/** The policies worth reading against each other: the optimum, one campaign at a time, the best fixed one, today's and the agent. */
function timelinePolicies(result: RotationPlanResult): PolicyResult[] {
  const wanted = [
    result.policies.find((policy) => policy.kind === "optimal"),
    result.policies.find((policy) => policy.kind === "myopic"),
    result.policies.find((policy) => policy.kind === "best_fixed"),
    result.policies.find((policy) => policy.is_current),
    result.policies.find((policy) => policy.kind === "agent"),
  ]
  const chosen: PolicyResult[] = []
  for (const policy of wanted) {
    if (
      policy &&
      !chosen.some((other) => other.policy_id === policy.policy_id)
    ) {
      chosen.push(policy)
    }
  }
  return chosen
}

function toRow(policy: PolicyResult): Row {
  const campaigns = [...policy.test.campaigns].sort(
    (a, b) => a.campaign_start_year - b.campaign_start_year
  )
  let total = 0
  return {
    policy,
    campaigns,
    cumulative: campaigns.map((campaign) => {
      total += campaign.score
      return total
    }),
  }
}

/** In how many campaigns the optimum scored at least as well as every other policy shown. */
function optimumTakeaway(rows: ReadonlyArray<Row>): string | null {
  const [optimal, ...others] = rows
  if (optimal?.policy.kind !== "optimal" || others.length === 0) {
    return null
  }
  const best = optimal.campaigns.filter((campaign, index) =>
    others.every(
      (other) => (other.campaigns[index]?.score ?? -Infinity) <= campaign.score
    )
  ).length
  return translate(
    "The exact optimum scored at least as high as every other policy shown in {value1} of the {value2} campaigns.",
    { value1: best, value2: optimal.campaigns.length }
  )
}

/** The end of the cumulative lines: who finished highest, next to the optimum. */
function cumulativeTakeaway(rows: ReadonlyArray<Row>): string | null {
  const optimal = rows.find((row) => row.policy.kind === "optimal")
  const leader = rows.reduce<Row | null>(
    (best, row) =>
      best === null ||
      (row.cumulative.at(-1) ?? 0) > (best.cumulative.at(-1) ?? 0)
        ? row
        : best,
    null
  )
  if (!optimal || !leader) return null
  const optimalTotal = formatScore(optimal.cumulative.at(-1) ?? 0)
  if (leader.policy.policy_id === optimal.policy.policy_id) {
    return translate(
      "After {value1} held-out campaigns the exact optimum has the highest cumulative score: {value2}.",
      { value1: optimal.campaigns.length, value2: optimalTotal }
    )
  }
  return translate(
    "After {value1} held-out campaigns {value2} has the highest cumulative score ({value3}); the exact optimum has {value4}.",
    {
      value1: optimal.campaigns.length,
      value2: plannerText(leader.policy.label),
      value3: formatScore(leader.cumulative.at(-1) ?? 0),
      value4: optimalTotal,
    }
  )
}

function CumulativeChart({
  rows,
  highlighted,
}: {
  rows: ReadonlyArray<Row>
  highlighted: string | null
}) {
  const { t } = useI18n("app")

  const [containerRef, measuredWidth] = useElementWidth<HTMLDivElement>()
  const width = Math.max(measuredWidth, MIN_CHART_WIDTH_PX)
  const innerWidth = width - CHART_MARGIN.left - CHART_MARGIN.right
  const innerHeight = CHART_HEIGHT_PX - CHART_MARGIN.top - CHART_MARGIN.bottom
  const years =
    rows[0]?.campaigns.map((campaign) => campaign.campaign_start_year) ?? []
  const [yMin, yMax] = paddedDomain([
    0,
    ...rows.flatMap((row) => row.cumulative),
  ])
  const step = years.length > 1 ? innerWidth / (years.length - 1) : 0

  const xOf = (index: number) => CHART_MARGIN.left + index * step
  const yOf = (value: number) =>
    CHART_MARGIN.top + (1 - (value - yMin) / (yMax - yMin)) * innerHeight

  // End labels sit at each line's last value, pushed apart so none overlaps another.
  const labels = rows
    .map((row) => ({
      row,
      y: yOf(row.cumulative.at(-1) ?? 0),
    }))
    .sort((a, b) => a.y - b.y)
  for (let index = 1; index < labels.length; index += 1) {
    labels[index].y = Math.max(
      labels[index].y,
      labels[index - 1].y + END_LABEL_GAP_PX
    )
  }

  return (
    <div ref={containerRef} className="w-full">
      <svg width={width} height={CHART_HEIGHT_PX} className="block max-w-full">
        <title>
          {t("Cumulative score of each policy over the held-out campaigns")}
        </title>
        {niceTicks(yMin, yMax, 4).map((value) => (
          <g key={value}>
            <line
              x1={CHART_MARGIN.left}
              x2={CHART_MARGIN.left + innerWidth}
              y1={yOf(value)}
              y2={yOf(value)}
              className={
                value === 0 ? "stroke-muted-foreground" : "stroke-border"
              }
            />
            <text
              x={CHART_MARGIN.left - 8}
              y={yOf(value) + 4}
              textAnchor="end"
              className="fill-muted-foreground"
              fontSize={11}
            >
              {formatScore(value)}
            </text>
          </g>
        ))}
        {years.map((year, index) => (
          <text
            key={year}
            x={xOf(index)}
            y={CHART_HEIGHT_PX - 8}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize={10}
          >
            {campaignShortName(year)}
          </text>
        ))}
        {rows.map((row, rowIndex) => {
          const isHighlighted = row.policy.policy_id === highlighted
          const isDimmed = highlighted !== null && !isHighlighted
          return (
            <path
              key={row.policy.policy_id}
              d={linePath(
                row.cumulative.map((value, index) => ({
                  x: xOf(index),
                  y: yOf(value),
                }))
              )}
              fill="none"
              strokeLinejoin="round"
              strokeWidth={isHighlighted ? 2.5 : 1.5}
              strokeDasharray={LINE_DASHES[rowIndex % LINE_DASHES.length]}
              className={cn(
                "transition-opacity duration-200 motion-reduce:transition-none",
                isHighlighted ? "stroke-primary" : "stroke-foreground",
                isDimmed && "opacity-30"
              )}
            />
          )
        })}
        {labels.map(({ row, y }) => {
          const isHighlighted = row.policy.policy_id === highlighted
          const text =
            plannerText(row.policy.label).length > END_LABEL_MAX_CHARS
              ? `${plannerText(row.policy.label).slice(0, END_LABEL_MAX_CHARS - 1)}…`
              : plannerText(row.policy.label)
          return (
            <text
              key={row.policy.policy_id}
              x={CHART_MARGIN.left + innerWidth + 8}
              y={y + 4}
              fontSize={11}
              className={cn(
                isHighlighted ? "fill-primary font-medium" : "fill-foreground",
                highlighted !== null && !isHighlighted && "opacity-40"
              )}
            >
              {text} {formatScore(row.cumulative.at(-1) ?? 0)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

/**
 * The held-out campaigns, one column each: the crops every policy would have grown, the score
 * it would have earned, and the El Niño phase the campaign started in. Hovering a row
 * highlights that policy here and in the cumulative chart below.
 */
export function BacktestTimeline({ result }: { result: RotationPlanResult }) {
  const { t } = useI18n("app")

  const [highlighted, setHighlighted] = useState<string | null>(null)
  const rows = timelinePolicies(result).map(toRow)
  const reference = rows[0]?.campaigns ?? []
  const scores = rows.flatMap((row) =>
    row.campaigns.map((campaign) => campaign.score)
  )
  const barMin = Math.min(0, ...scores)
  const barMax = Math.max(0, ...scores)
  const barSpan = barMax - barMin || 1
  const zeroY = (barMax / barSpan) * BAR_HEIGHT_PX
  const columns = `${LABEL_COLUMN} repeat(${reference.length}, minmax(${CAMPAIGN_COLUMN_MIN}, 1fr))`
  const first = reference[0]?.campaign_start_year
  const last = reference.at(-1)?.campaign_start_year

  const optimumSummary = optimumTakeaway(rows)
  const chartSummary = cumulativeTakeaway(rows)

  return (
    <>
      <ResultSection
        title={t("Backtest on held-out campaigns")}
        lead={
          first !== undefined && last !== undefined
            ? t(
                "Campaigns {value1} to {value2} were never used to fit or to choose a policy. Bars are each campaign's score, unitless and higher is better.",
                { value1: campaignName(first), value2: campaignName(last) }
              )
            : t("Campaigns that were never used to fit or to choose a policy.")
        }
        sources={sourcesById(result.sources, [
          "nasa-power",
          "noaa-oni",
          "magyp",
          "prices",
        ])}
      >
        {optimumSummary && <p className="text-sm">{optimumSummary}</p>}
        <div className="overflow-x-auto">
          <div
            className="flex min-w-max flex-col gap-1"
            style={{ minWidth: "100%" }}
          >
            <div
              className="grid items-center gap-1"
              style={{ gridTemplateColumns: columns }}
            >
              <span className="text-xs text-muted-foreground">
                {t("Campaign")}
              </span>
              {reference.map((campaign) => (
                <span
                  key={campaign.campaign_start_year}
                  className="text-center text-xs tabular-nums text-muted-foreground"
                >
                  {campaignShortName(campaign.campaign_start_year)}
                </span>
              ))}
            </div>
            <div
              className="grid items-center gap-1"
              style={{ gridTemplateColumns: columns }}
            >
              <span className="text-xs text-muted-foreground">
                {t("El Niño phase, June")}
              </span>
              {reference.map((campaign) => (
                <span
                  key={campaign.campaign_start_year}
                  title={t("{value1} in June, {value2} in August", {
                    value1: t(ENSO_LABEL[campaign.enso_june]),
                    value2: t(ENSO_LABEL[campaign.enso_august]),
                  })}
                  className={cn(
                    "rounded-sm py-0.5 text-center text-[10px] font-medium",
                    ENSO_TONE[campaign.enso_june]
                  )}
                >
                  {ENSO_SHORT[campaign.enso_june]}
                </span>
              ))}
            </div>

            {rows.map((row) => {
              const isHighlighted = row.policy.policy_id === highlighted
              return (
                <button
                  key={row.policy.policy_id}
                  type="button"
                  aria-pressed={isHighlighted}
                  onMouseEnter={() => setHighlighted(row.policy.policy_id)}
                  onMouseLeave={() => setHighlighted(null)}
                  onFocus={() => setHighlighted(row.policy.policy_id)}
                  onBlur={() => setHighlighted(null)}
                  className={cn(
                    "grid items-center gap-1 rounded-lg border border-transparent py-2 text-left outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                    isHighlighted && "border-primary/30 bg-primary/5"
                  )}
                  style={{ gridTemplateColumns: columns }}
                >
                  <span className="flex min-w-0 flex-col gap-0.5 pl-2">
                    <span
                      title={plannerText(row.policy.label)}
                      className={cn(
                        "line-clamp-2 text-sm font-medium",
                        isHighlighted && "text-primary"
                      )}
                    >
                      {plannerText(row.policy.label)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {row.policy.is_current
                        ? t("Current")
                        : t(POLICY_KIND_LABEL[row.policy.kind])}
                    </span>
                  </span>
                  {row.campaigns.map((campaign) => (
                    <span
                      key={campaign.campaign_start_year}
                      title={t("{value1}: {value2}. Score {value3}", {
                        value1: campaignName(campaign.campaign_start_year),
                        value2: itineraryLabel(campaign.itinerary),
                        value3: formatScore(campaign.score),
                      })}
                      className="flex flex-col gap-1"
                    >
                      <ItineraryChip itinerary={campaign.itinerary} />
                      <span
                        aria-hidden
                        className="relative block"
                        style={{ height: BAR_HEIGHT_PX }}
                      >
                        <span
                          className="absolute inset-x-0 h-px bg-border"
                          style={{ top: zeroY }}
                        />
                        <span
                          className={cn(
                            "absolute inset-x-1.5 rounded-xs transition-colors duration-200 motion-reduce:transition-none",
                            isHighlighted ? "bg-primary" : "bg-foreground/45"
                          )}
                          style={{
                            top:
                              campaign.score >= 0
                                ? zeroY -
                                  (campaign.score / barSpan) * BAR_HEIGHT_PX
                                : zeroY,
                            height: Math.max(
                              (Math.abs(campaign.score) / barSpan) *
                                BAR_HEIGHT_PX,
                              1
                            ),
                          }}
                        />
                      </span>
                    </span>
                  ))}
                </button>
              )
            })}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {t(
            "Each campaign shows two blocks: the winter crop above, the summer crop below. Hover or focus a row to highlight that policy here and in the cumulative chart."
          )}
        </p>
      </ResultSection>

      <ResultSection
        title={t("Cumulative score over the held-out campaigns")}
        lead={t(
          "The running total of each policy's campaign scores, in score units."
        )}
        sources={sourcesById(result.sources, ["nasa-power", "magyp", "prices"])}
      >
        {chartSummary && <p className="text-sm">{chartSummary}</p>}
        <CumulativeChart rows={rows} highlighted={highlighted} />
      </ResultSection>
    </>
  )
}
