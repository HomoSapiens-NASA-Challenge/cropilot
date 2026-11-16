import type { ConvergencePoint } from "@cropilot/api"
import {
  linePath,
  niceTicks,
  paddedDomain,
} from "@/features/planner/chart-scale"
import {
  formatScore,
  formatShare,
  formatWhole,
} from "@/features/planner/planner-format"
import { useElementWidth } from "@/hooks/use-element-width"
import { useI18n } from "@/lib/i18n"

const MARGIN = { top: 12, right: 28, bottom: 44, left: 52 } as const
const SCORE_HEIGHT_PX = 190
const AGREEMENT_HEIGHT_PX = 64
const PLOT_GAP_PX = 22
const MIN_WIDTH_PX = 280
const LABEL_FONT_PX = 11
const DOT_RADIUS = 2.5

const REPORTED_SEED = 0

type AgentLine = { seed: number; points: ConvergencePoint[] }

/** Checkpoints grouped by the agent (random seed) that produced them, in training order. */
function groupBySeed(points: ReadonlyArray<ConvergencePoint>): AgentLine[] {
  const lines = new Map<number, ConvergencePoint[]>()
  for (const point of points) {
    const line = lines.get(point.seed)
    if (line) line.push(point)
    else lines.set(point.seed, [point])
  }
  return [...lines.entries()]
    .sort(([a], [b]) => a - b)
    .map(([seed, linePoints]) => ({ seed, points: linePoints }))
}

/**
 * Each agent trains from its own random seed and every point is a checkpoint scored exactly,
 * so a line is not noise from single episodes. Agent 1 is the one reported elsewhere.
 */
export function ConvergenceChart({
  points,
  optimalScore,
  episodesPerAgent,
  agentSeeds,
}: {
  points: ReadonlyArray<ConvergencePoint>
  optimalScore: number | null
  episodesPerAgent: number
  agentSeeds: number
}) {
  const { t } = useI18n("app")

  const [containerRef, measuredWidth] = useElementWidth<HTMLDivElement>()
  const width = Math.max(measuredWidth, MIN_WIDTH_PX)
  const innerWidth = width - MARGIN.left - MARGIN.right
  const scoreTop = MARGIN.top
  const agreementTop = scoreTop + SCORE_HEIGHT_PX + PLOT_GAP_PX
  const height = agreementTop + AGREEMENT_HEIGHT_PX + MARGIN.bottom

  const lines = groupBySeed(points)
  const reported = lines.find((line) => line.seed === REPORTED_SEED)
  const latest = reported?.points.at(-1)
  const finalAgreements = lines.flatMap((line) => {
    const last = line.points.at(-1)
    return last ? [last.agreement_share] : []
  })
  const xMax = Math.max(episodesPerAgent, 1)
  const scores = points.map((point) => point.agent_score)
  if (optimalScore !== null) scores.push(optimalScore)
  const [yMin, yMax] = scores.length > 0 ? paddedDomain(scores) : [0, 1]

  const xOf = (episodes: number) => MARGIN.left + (episodes / xMax) * innerWidth
  const scoreY = (score: number) =>
    scoreTop + (1 - (score - yMin) / (yMax - yMin)) * SCORE_HEIGHT_PX
  const agreementY = (share: number) =>
    agreementTop + (1 - share) * AGREEMENT_HEIGHT_PX

  const xTicks = niceTicks(0, xMax, 5)
  const minAgreement = Math.min(...finalAgreements)
  const maxAgreement = Math.max(...finalAgreements)

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {agentSeeds}{" "}
        {t(
          " agents, each from its own random seed. Agent 1, highlighted, is the one reported below."
        )}
      </p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <svg width="18" height="6" aria-hidden>
            <line
              x1="0"
              x2="18"
              y1="3"
              y2="3"
              className="stroke-primary"
              strokeWidth={2}
            />
          </svg>
          {t("Agent 1 score")}
          {latest && (
            <span className="tabular-nums text-foreground">
              {formatScore(latest.agent_score)}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="18" height="6" aria-hidden>
            <line
              x1="0"
              x2="18"
              y1="3"
              y2="3"
              className="stroke-muted-foreground"
              strokeWidth={1}
            />
          </svg>
          {t("Other agents")}
        </span>
        {optimalScore !== null && (
          <span className="flex items-center gap-1.5">
            <svg width="18" height="6" aria-hidden>
              <line
                x1="0"
                x2="18"
                y1="3"
                y2="3"
                className="stroke-foreground"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
            </svg>
            {t("Exact optimum")}
            <span className="tabular-nums text-foreground">
              {formatScore(optimalScore)}
            </span>
          </span>
        )}
        {latest && (
          <span>
            {t("Agent 1 agrees with the optimum in")}{" "}
            <span className="tabular-nums text-foreground">
              {formatShare(latest.agreement_share)}
            </span>{" "}
            {t("of states")}
            {lines.length > 1 && (
              <>
                {t("; across ")}
                {lines.length} {t(" agents,")}{" "}
                <span className="tabular-nums text-foreground">
                  {formatShare(minAgreement)} {t(" to ")}
                  {formatShare(maxAgreement)}
                </span>
              </>
            )}
          </span>
        )}
      </div>

      <div ref={containerRef} className="w-full">
        <svg width={width} height={height} className="block max-w-full">
          <title>
            {latest
              ? t(
                  "Score and agreement with the exact optimum of {value1} agents over {value2} training episodes each",
                  { value1: agentSeeds, value2: formatWhole(xMax) }
                )
              : t("Training has not reported a checkpoint yet")}
          </title>

          {scores.length > 0 &&
            niceTicks(yMin, yMax, 4).map((value) => (
              <g key={`score-${value}`}>
                <line
                  x1={MARGIN.left}
                  x2={MARGIN.left + innerWidth}
                  y1={scoreY(value)}
                  y2={scoreY(value)}
                  className="stroke-border"
                />
                <text
                  x={MARGIN.left - 8}
                  y={scoreY(value) + 4}
                  textAnchor="end"
                  className="fill-muted-foreground"
                  fontSize={LABEL_FONT_PX}
                >
                  {formatScore(value)}
                </text>
              </g>
            ))}
          {[0, 0.5, 1].map((share) => (
            <g key={`agreement-${share}`}>
              <line
                x1={MARGIN.left}
                x2={MARGIN.left + innerWidth}
                y1={agreementY(share)}
                y2={agreementY(share)}
                className="stroke-border"
              />
              <text
                x={MARGIN.left - 8}
                y={agreementY(share) + 4}
                textAnchor="end"
                className="fill-muted-foreground"
                fontSize={LABEL_FONT_PX}
              >
                {formatShare(share)}
              </text>
            </g>
          ))}
          <text
            x={MARGIN.left}
            y={agreementTop - 6}
            className="fill-muted-foreground"
            fontSize={LABEL_FONT_PX}
          >
            {t("Share of states with the optimal action")}
          </text>

          {xTicks.map((value) => (
            <g key={`episodes-${value}`}>
              <line
                x1={xOf(value)}
                x2={xOf(value)}
                y1={agreementTop + AGREEMENT_HEIGHT_PX}
                y2={agreementTop + AGREEMENT_HEIGHT_PX + 4}
                className="stroke-muted-foreground"
              />
              <text
                x={xOf(value)}
                y={agreementTop + AGREEMENT_HEIGHT_PX + 18}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={LABEL_FONT_PX}
              >
                {formatWhole(value)}
              </text>
            </g>
          ))}
          <text
            x={MARGIN.left + innerWidth}
            y={height - 4}
            textAnchor="end"
            className="fill-foreground"
            fontSize={LABEL_FONT_PX}
          >
            {t("Training episodes per agent")}
          </text>

          {optimalScore !== null && (
            <line
              x1={MARGIN.left}
              x2={MARGIN.left + innerWidth}
              y1={scoreY(optimalScore)}
              y2={scoreY(optimalScore)}
              className="stroke-foreground"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
          )}
          {/* Reported agent last, so it is drawn over the others. */}
          {[...lines]
            .sort(
              (a, b) =>
                Number(a.seed === REPORTED_SEED) -
                Number(b.seed === REPORTED_SEED)
            )
            .map((line) => {
              const isReported = line.seed === REPORTED_SEED
              const last = line.points.at(-1)
              return (
                <g key={line.seed}>
                  {line.points.length > 1 && (
                    <>
                      <path
                        d={linePath(
                          line.points.map((point) => ({
                            x: xOf(point.episodes),
                            y: agreementY(point.agreement_share),
                          }))
                        )}
                        fill="none"
                        strokeLinejoin="round"
                        strokeWidth={isReported ? 1.5 : 1}
                        className={
                          isReported
                            ? "stroke-foreground"
                            : "stroke-muted-foreground opacity-50"
                        }
                      />
                      <path
                        d={linePath(
                          line.points.map((point) => ({
                            x: xOf(point.episodes),
                            y: scoreY(point.agent_score),
                          }))
                        )}
                        fill="none"
                        strokeLinejoin="round"
                        strokeWidth={isReported ? 2 : 1}
                        className={
                          isReported
                            ? "stroke-primary"
                            : "stroke-muted-foreground opacity-60"
                        }
                      />
                    </>
                  )}
                  {last && (
                    <circle
                      cx={xOf(last.episodes)}
                      cy={scoreY(last.agent_score)}
                      r={isReported ? DOT_RADIUS + 1.5 : DOT_RADIUS}
                      className={
                        isReported
                          ? "fill-primary stroke-background"
                          : "fill-muted-foreground stroke-background"
                      }
                      strokeWidth={1}
                    />
                  )}
                </g>
              )
            })}
          {!latest && (
            <text
              x={MARGIN.left + innerWidth / 2}
              y={scoreTop + SCORE_HEIGHT_PX / 2}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={LABEL_FONT_PX + 1}
            >
              {t("Waiting for the first training checkpoint")}
            </text>
          )}
        </svg>
      </div>
    </div>
  )
}
