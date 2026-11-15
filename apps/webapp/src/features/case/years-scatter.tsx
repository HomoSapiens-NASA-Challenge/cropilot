import type { CampaignPoint, CurrentCampaign } from "@cropilot/api"
import { cn } from "cn"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  ENSO_PHASE_LABEL,
  formatPercentSigned,
  formatSigned,
  formatWetness,
  PROVENANCE,
  type Provenance,
} from "@/features/case/case-format"
import { useElementWidth } from "@/hooks/use-element-width"
import { anomalyColor } from "@/lib/data-colors"

export type YieldCrop = "maize" | "soybean"

export const YIELD_CROP_LABEL = {
  maize: "Maize",
  soybean: "Soybean",
} as const satisfies Record<YieldCrop, string>

export function yieldOf(
  campaign: CampaignPoint,
  crop: YieldCrop
): { anomalyPct: number | null; provenance: Provenance } {
  return crop === "maize"
    ? {
        anomalyPct: campaign.maize_yield_anomaly_pct,
        provenance: campaign.maize_yield_provenance,
      }
    : {
        anomalyPct: campaign.soybean_yield_anomaly_pct,
        provenance: campaign.soybean_yield_provenance,
      }
}

const MARGIN = { top: 20, right: 14, bottom: 48, left: 46 } as const
const MIN_WIDTH_PX = 280
const DOT_RADIUS = 5
const ANALOG_RADIUS = 6
// Extra radius of each dot's button, so small dots are easy to hit with a finger.
const HIT_SLOP_PX = 4
const LABEL_FONT_PX = 11
const LABEL_HEIGHT_PX = 14
const CHAR_WIDTH_PX = 6.2
const TOOLTIP_WIDTH_PX = 256

type Box = { x: number; y: number; width: number; height: number }

function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

/** First free spot around a point: right, left, above, below. Falls back to the right. */
function placeLabel(
  point: { x: number; y: number },
  width: number,
  placed: ReadonlyArray<Box>,
  bounds: Box
): Box {
  const gap = ANALOG_RADIUS + 4
  const candidates: Box[] = [
    {
      x: point.x + gap,
      y: point.y - LABEL_HEIGHT_PX / 2,
      width,
      height: LABEL_HEIGHT_PX,
    },
    {
      x: point.x - gap - width,
      y: point.y - LABEL_HEIGHT_PX / 2,
      width,
      height: LABEL_HEIGHT_PX,
    },
    {
      x: point.x - width / 2,
      y: point.y - gap - LABEL_HEIGHT_PX,
      width,
      height: LABEL_HEIGHT_PX,
    },
    {
      x: point.x - width / 2,
      y: point.y + gap,
      width,
      height: LABEL_HEIGHT_PX,
    },
  ]
  const isInside = (box: Box) =>
    box.x >= bounds.x &&
    box.y >= bounds.y &&
    box.x + box.width <= bounds.x + bounds.width &&
    box.y + box.height <= bounds.y + bounds.height
  const free = candidates.find(
    (box) => isInside(box) && !placed.some((other) => overlaps(box, other))
  )
  return free ?? candidates[0]
}

/** Round multiples of `step` inside [min, max], so a label always sits on its own value. */
function ticks(min: number, max: number, step: number): number[] {
  const values: number[] = []
  const first = Math.ceil(min / step - 1e-9)
  const last = Math.floor(max / step + 1e-9)
  for (let index = first; index <= last; index += 1) {
    values.push(Number((index * step).toFixed(2)))
  }
  return values
}

function CampaignTooltip({
  campaign,
  crop,
}: {
  campaign: CampaignPoint
  crop: YieldCrop
}) {
  const yieldValue = yieldOf(campaign, crop)
  return (
    <div className="flex flex-col gap-1.5 text-xs">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{campaign.campaign}</span>
        {campaign.is_analog && campaign.analog_rank !== null && (
          <Badge variant="outline">Analog {campaign.analog_rank}</Badge>
        )}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        <dt className="text-muted-foreground">Phase (July to September)</dt>
        <dd className="text-right">{ENSO_PHASE_LABEL[campaign.enso_phase]}</dd>
        <dt className="text-muted-foreground">ONI</dt>
        <dd className="text-right tabular-nums">
          {formatSigned(campaign.oni_jas)}
        </dd>
        <dt className="text-muted-foreground">Soil wetness, end of August</dt>
        <dd className="text-right tabular-nums">
          {campaign.soil_wetness_end_aug === null
            ? "Missing"
            : formatWetness(campaign.soil_wetness_end_aug)}
        </dd>
        <dt className="text-muted-foreground">
          {YIELD_CROP_LABEL[crop]} yield vs trend
        </dt>
        <dd className="text-right tabular-nums">
          {yieldValue.anomalyPct === null
            ? "Missing"
            : formatPercentSigned(yieldValue.anomalyPct)}
        </dd>
        <dt className="text-muted-foreground">Yield provenance</dt>
        <dd className="text-right">
          {PROVENANCE[yieldValue.provenance].label}
        </dd>
      </dl>
      {campaign.notes.map((note) => (
        <p key={note.kind} className="border-t pt-1.5 text-muted-foreground">
          {note.text}
        </p>
      ))}
    </div>
  )
}

/**
 * One dot per past campaign: ONI July to September across, soil wetness at the end of
 * August up. The analogs carry their rank and name, and 2026/27 is drawn even when it
 * falls outside the cloud.
 */
export function YearsScatter({
  campaigns,
  current,
  crop,
  yieldLimitPct,
}: {
  campaigns: ReadonlyArray<CampaignPoint>
  current: CurrentCampaign
  crop: YieldCrop
  /** Anomaly at which the color scale saturates. */
  yieldLimitPct: number
}) {
  const [containerRef, measuredWidth] = useElementWidth<HTMLDivElement>()
  const [hoveredCampaign, setHoveredCampaign] = useState<string | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)

  const width = Math.max(measuredWidth, MIN_WIDTH_PX)
  const height = Math.min(Math.max(Math.round(width * 0.68), 320), 440)
  const innerWidth = width - MARGIN.left - MARGIN.right
  const innerHeight = height - MARGIN.top - MARGIN.bottom

  const plotted = campaigns.filter(
    (campaign) => campaign.soil_wetness_end_aug !== null
  )
  const onis = [
    ...campaigns.map((campaign) => campaign.oni_jas),
    current.oni_jas,
  ]
  const wetness = [
    ...plotted.map((campaign) => campaign.soil_wetness_end_aug ?? 0),
    current.soil_wetness_end_aug,
  ]
  const xMin = Math.floor(Math.min(...onis) * 2) / 2
  const xMax = Math.ceil(Math.max(...onis) * 2) / 2
  const yMin = Math.floor(Math.min(...wetness) * 20) / 20
  const yMax = Math.min(Math.ceil(Math.max(...wetness) * 20) / 20, 1)

  const xOf = (oni: number) =>
    MARGIN.left + ((oni - xMin) / (xMax - xMin)) * innerWidth
  const yOf = (value: number) =>
    MARGIN.top + (1 - (value - yMin) / (yMax - yMin)) * innerHeight

  const activeId = hoveredCampaign ?? selectedCampaign
  const active = campaigns.find((campaign) => campaign.campaign === activeId)

  // Labels of the analogs, best rank first so the closest year gets the best spot.
  const bounds: Box = {
    x: MARGIN.left,
    y: 0,
    width: innerWidth,
    height: MARGIN.top + innerHeight,
  }
  const currentX = xOf(current.oni_jas)
  const currentY = yOf(current.soil_wetness_end_aug)
  const currentLabel = `${current.campaign} now`
  const currentLabelWidth = currentLabel.length * CHAR_WIDTH_PX
  const placed: Box[] = [
    placeLabel({ x: currentX, y: currentY }, currentLabelWidth, [], bounds),
  ]
  const analogLabels = [...plotted]
    .filter((campaign) => campaign.is_analog && campaign.analog_rank !== null)
    .sort((a, b) => (a.analog_rank ?? 0) - (b.analog_rank ?? 0))
    .map((campaign) => {
      const text = `${campaign.analog_rank} · ${campaign.campaign}`
      const box = placeLabel(
        {
          x: xOf(campaign.oni_jas),
          y: yOf(campaign.soil_wetness_end_aug ?? 0),
        },
        text.length * CHAR_WIDTH_PX,
        placed,
        bounds
      )
      placed.push(box)
      return { campaign: campaign.campaign, text, box }
    })

  const toggleSelected = (campaignName: string) =>
    setSelectedCampaign((previous) =>
      previous === campaignName ? null : campaignName
    )

  const beyondRecordX = xOf(current.highest_past_oni_jas)
  const tooltipLeft = active
    ? Math.min(
        Math.max(xOf(active.oni_jas) - TOOLTIP_WIDTH_PX / 2, 0),
        Math.max(width - TOOLTIP_WIDTH_PX, 0)
      )
    : 0
  const activeY = active ? yOf(active.soil_wetness_end_aug ?? yMin) : 0
  const tooltipBelow = activeY < height / 2

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        width={width}
        height={height}
        className="block max-w-full select-none"
      >
        <title>{`Scatter of ${campaigns.length} past campaigns by ONI and soil wetness, with ${current.campaign} marked`}</title>
        {current.outside_historical_range && (
          <g>
            <rect
              x={beyondRecordX}
              y={MARGIN.top}
              width={Math.max(MARGIN.left + innerWidth - beyondRecordX, 0)}
              height={innerHeight}
              className="fill-accent"
            />
            <text
              x={MARGIN.left + innerWidth - 6}
              y={MARGIN.top + 14}
              textAnchor="end"
              className="fill-muted-foreground"
              fontSize={LABEL_FONT_PX}
            >
              Above every past campaign
            </text>
          </g>
        )}
        {ticks(yMin, yMax, 0.1).map((value) => (
          <g key={`y-${value}`}>
            <line
              x1={MARGIN.left}
              x2={MARGIN.left + innerWidth}
              y1={yOf(value)}
              y2={yOf(value)}
              className="stroke-border"
            />
            <text
              x={MARGIN.left - 8}
              y={yOf(value) + 4}
              textAnchor="end"
              className="fill-muted-foreground"
              fontSize={LABEL_FONT_PX}
            >
              {value.toFixed(1)}
            </text>
          </g>
        ))}
        {ticks(xMin, xMax, 0.5).map((value) => (
          <g key={`x-${value}`}>
            <line
              x1={xOf(value)}
              x2={xOf(value)}
              y1={MARGIN.top + innerHeight}
              y2={MARGIN.top + innerHeight + 4}
              className="stroke-muted-foreground"
            />
            <text
              x={xOf(value)}
              y={MARGIN.top + innerHeight + 18}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={LABEL_FONT_PX}
            >
              {formatSigned(value, 1)}
            </text>
          </g>
        ))}
        <line
          x1={MARGIN.left}
          x2={MARGIN.left + innerWidth}
          y1={MARGIN.top + innerHeight}
          y2={MARGIN.top + innerHeight}
          className="stroke-muted-foreground"
        />
        <text
          x={MARGIN.left + innerWidth / 2}
          y={height - 8}
          textAnchor="middle"
          className="fill-foreground"
          fontSize={LABEL_FONT_PX + 1}
        >
          ONI, July to September (NOAA)
        </text>
        <text
          transform={`translate(12 ${MARGIN.top + innerHeight / 2}) rotate(-90)`}
          textAnchor="middle"
          className="fill-foreground"
          fontSize={LABEL_FONT_PX + 1}
        >
          Soil wetness, end of August (NASA POWER, 0 to 1)
        </text>

        {plotted.map((campaign) => {
          const yieldValue = yieldOf(campaign, crop)
          const cx = xOf(campaign.oni_jas)
          const cy = yOf(campaign.soil_wetness_end_aug ?? 0)
          const isActive = campaign.campaign === activeId
          const radius = campaign.is_analog ? ANALOG_RADIUS : DOT_RADIUS
          const color =
            yieldValue.anomalyPct === null
              ? null
              : anomalyColor(yieldValue.anomalyPct, yieldLimitPct)
          const isModeled = yieldValue.provenance === "modeled"
          return (
            <g key={campaign.campaign}>
              {campaign.notes.length > 0 && (
                <g aria-hidden className="pointer-events-none">
                  <line
                    x1={cx}
                    x2={cx}
                    y1={cy - radius}
                    y2={cy - radius - 9}
                    className="stroke-foreground"
                  />
                  <circle
                    cx={cx}
                    cy={cy - radius - 11}
                    r={2.5}
                    className="fill-foreground"
                  />
                </g>
              )}
              {campaign.is_analog && (
                <circle
                  aria-hidden
                  cx={cx}
                  cy={cy}
                  r={radius + 3.5}
                  className="pointer-events-none fill-none stroke-foreground"
                  strokeWidth={1.5}
                />
              )}
              <circle
                aria-hidden
                cx={cx}
                cy={cy}
                r={isActive ? radius + 1.5 : radius}
                strokeWidth={isModeled || color === null ? 2 : 1}
                strokeDasharray={color === null ? "2 2" : undefined}
                className={cn(
                  "pointer-events-none",
                  isActive && "stroke-primary"
                )}
                style={{
                  fill:
                    isModeled || color === null ? "var(--background)" : color,
                  stroke: isActive
                    ? undefined
                    : color === null
                      ? "var(--muted-foreground)"
                      : isModeled
                        ? color
                        : "color-mix(in oklab, var(--foreground) 30%, transparent)",
                }}
              />
            </g>
          )
        })}

        {analogLabels.map((label) => (
          <text
            key={label.campaign}
            aria-hidden
            x={label.box.x}
            y={label.box.y + LABEL_FONT_PX}
            fontSize={LABEL_FONT_PX}
            className="pointer-events-none fill-foreground stroke-background font-medium"
            strokeWidth={3}
            paintOrder="stroke"
          >
            {label.text}
          </text>
        ))}

        <g aria-hidden>
          <path
            d={`M ${currentX} ${currentY - 9} L ${currentX + 9} ${currentY} L ${currentX} ${currentY + 9} L ${currentX - 9} ${currentY} Z`}
            className="fill-primary stroke-background"
            strokeWidth={2}
          />
          <text
            x={placed[0].x}
            y={placed[0].y + LABEL_FONT_PX}
            fontSize={LABEL_FONT_PX}
            className="fill-primary stroke-background font-medium"
            strokeWidth={3}
            paintOrder="stroke"
          >
            {currentLabel}
          </text>
        </g>
      </svg>

      {/* Hit targets: real buttons over the drawn dots, so every campaign is reachable by
          keyboard and announced by screen readers. The SVG above only draws. */}
      {plotted.map((campaign) => {
        const cx = xOf(campaign.oni_jas)
        const cy = yOf(campaign.soil_wetness_end_aug ?? 0)
        const hitRadius =
          (campaign.is_analog ? ANALOG_RADIUS : DOT_RADIUS) + HIT_SLOP_PX
        return (
          <button
            key={campaign.campaign}
            type="button"
            aria-label={`${campaign.campaign}, ONI ${formatSigned(campaign.oni_jas)}`}
            aria-pressed={campaign.campaign === selectedCampaign}
            className="absolute cursor-pointer rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            style={{
              left: cx - hitRadius,
              top: cy - hitRadius,
              width: hitRadius * 2,
              height: hitRadius * 2,
            }}
            onMouseEnter={() => setHoveredCampaign(campaign.campaign)}
            onMouseLeave={() => setHoveredCampaign(null)}
            onFocus={() => setHoveredCampaign(campaign.campaign)}
            onBlur={() => setHoveredCampaign(null)}
            onClick={() => toggleSelected(campaign.campaign)}
          />
        )
      })}

      {active && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg bg-background/75 p-3 shadow-lg ring-1 ring-foreground/10 backdrop-blur-lg"
          style={{
            width: TOOLTIP_WIDTH_PX,
            left: tooltipLeft,
            top: tooltipBelow ? activeY + 14 : undefined,
            bottom: tooltipBelow ? undefined : height - activeY + 14,
          }}
        >
          <CampaignTooltip campaign={active} crop={crop} />
        </div>
      )}
    </div>
  )
}
