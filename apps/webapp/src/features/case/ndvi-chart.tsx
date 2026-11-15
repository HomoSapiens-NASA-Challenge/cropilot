import { cn } from "cn"
import { useElementWidth } from "@/hooks/use-element-width"

export type NdviSeries = {
  id: string
  label: string
  values: ReadonlyArray<number | null>
  /** Zone or reference curves are drawn quieter than the curve being read. */
  tone: "primary" | "muted"
  /** Opacity of each dot, between 0 and 1. Absent when every dot is as sure as the next. */
  dotOpacity?: ReadonlyArray<number>
}

const MARGIN = { top: 10, right: 10, bottom: 26, left: 34 } as const
const HEIGHT_PX = 168
const MIN_WIDTH_PX = 220
const FONT_PX = 11
const Y_TICKS = [0, 0.25, 0.5, 0.75, 1] as const

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

/** "Sep" from "2025-09"; any other label is shown as it came. */
export function monthLabel(month: string): string {
  const match = /^\d{4}-(\d{2})$/.exec(month)
  return match ? (MONTHS[Number(match[1]) - 1] ?? month) : month
}

/** Segments of a line, split wherever a value is missing so a gap is never bridged. */
function segmentsOf(
  values: ReadonlyArray<number | null>,
  xOf: (index: number) => number,
  yOf: (value: number) => number
): string[] {
  const segments: string[] = []
  let current = ""
  values.forEach((value, index) => {
    if (value === null) {
      if (current) segments.push(current)
      current = ""
      return
    }
    current += `${current ? " L" : "M"} ${xOf(index)} ${yOf(value)}`
  })
  if (current) segments.push(current)
  return segments
}

/**
 * NDVI, the greenness index from 0 to 1, as lines over time. Missing months leave a gap.
 * `tickLabels` has one entry per point: the text under it, or `null` for none.
 */
export function NdviChart({
  series,
  tickLabels,
  className,
}: {
  series: ReadonlyArray<NdviSeries>
  tickLabels: ReadonlyArray<string | null>
  className?: string
}) {
  const [containerRef, measuredWidth] = useElementWidth<HTMLDivElement>()
  const width = Math.max(measuredWidth, MIN_WIDTH_PX)
  const innerWidth = width - MARGIN.left - MARGIN.right
  const innerHeight = HEIGHT_PX - MARGIN.top - MARGIN.bottom
  const pointCount = tickLabels.length
  const xOf = (index: number) =>
    MARGIN.left +
    (pointCount > 1 ? (index / (pointCount - 1)) * innerWidth : innerWidth / 2)
  const yOf = (value: number) => MARGIN.top + (1 - value) * innerHeight

  return (
    <div ref={containerRef} className={cn("w-full", className)}>
      <svg
        width={width}
        height={HEIGHT_PX}
        role="img"
        aria-label={`NDVI, 0 to 1: ${series.map((entry) => entry.label).join(" and ")}`}
        className="block max-w-full"
      >
        {Y_TICKS.map((tick) => (
          <g key={tick}>
            <line
              x1={MARGIN.left}
              x2={MARGIN.left + innerWidth}
              y1={yOf(tick)}
              y2={yOf(tick)}
              className="stroke-border"
            />
            <text
              x={MARGIN.left - 6}
              y={yOf(tick) + 4}
              textAnchor="end"
              fontSize={FONT_PX}
              className="fill-muted-foreground"
            >
              {tick}
            </text>
          </g>
        ))}
        {tickLabels.map((label, index) =>
          label === null ? null : (
            <text
              // Labels repeat across years, so the position keeps the keys apart.
              key={`${index}-${label}`}
              x={xOf(index)}
              y={HEIGHT_PX - 8}
              textAnchor="middle"
              fontSize={FONT_PX}
              className="fill-muted-foreground"
            >
              {label}
            </text>
          )
        )}
        {series.map((entry) => (
          <g key={entry.id}>
            {segmentsOf(entry.values, xOf, yOf).map((path) => (
              <path
                key={path}
                d={path}
                fill="none"
                strokeWidth={entry.tone === "primary" ? 2 : 1.5}
                strokeDasharray={entry.tone === "muted" ? "4 3" : undefined}
                className={
                  entry.tone === "primary"
                    ? "stroke-primary"
                    : "stroke-muted-foreground"
                }
              />
            ))}
            {entry.values.map((value, index) =>
              value === null ? null : (
                <circle
                  key={`${entry.id}-${tickLabels[index] ?? ""}-${index}`}
                  cx={xOf(index)}
                  cy={yOf(value)}
                  r={entry.tone === "primary" ? 2.5 : 1.5}
                  opacity={entry.dotOpacity?.[index] ?? 1}
                  className={
                    entry.tone === "primary"
                      ? "fill-primary"
                      : "fill-muted-foreground"
                  }
                />
              )
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}
