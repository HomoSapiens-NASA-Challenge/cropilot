import type { Margin, SeasonDashboard, Strategy } from "@cropilot/api"
import { useEffect, useMemo, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { FOCUS, GLASS, isMock } from "./data"
import { signed, usd } from "./format"
import { ProvenanceTag } from "./provenance-tag"
import type { SelectSeason as Select } from "./season-view"
import {
  marginScale,
  median,
  type SeasonPoint,
  type StrategySummary,
  summarizeStrategy,
  swarmOffsets,
  ticks,
} from "./stats"

type Props = {
  data: SeasonDashboard
  onSelectSeason: Select
}

/** Below lg the rows stack and the strip takes the full width. */
const COLS = "lg:grid-cols-[minmax(0,12rem)_9rem_minmax(0,1fr)]"
const TOGGLE_ON = "aria-pressed:bg-foreground/10 aria-pressed:text-foreground"

function marginSubtitle(m: Margin): string {
  if (isMock(m)) return "Synthetic margins, for layout only. Not results."
  const rent = m.includes_rent ? "after rent" : "before rent"
  const basis = m.basis === "per_year" ? "per year" : "per rotation cycle"
  return `Gross margin, USD/ha ${basis}, ${rent}. Prices: ${m.price_basis}.`
}

/** 2 · What each strategy earned in the seasons that started like this one. */
export function Strategies({ data, onSelectSeason }: Props) {
  const [view, setView] = useState<"chart" | "table">("chart")
  const summaries = useMemo(
    () =>
      data.strategies.map(
        (s) => [s, summarizeStrategy(s, data.seasons)] as const
      ),
    [data]
  )
  const scale = useMemo(
    () =>
      marginScale(summaries.flatMap(([, s]) => s.points.map((p) => p.value))),
    [summaries]
  )
  const nSimilar = data.seasons.filter((s) => s.is_similar).length
  const margin = data.strategies[0].margin
  const mock = isMock(margin)

  return (
    <Card className={GLASS}>
      <CardHeader>
        <CardTitle>
          <h2 className="inline text-lg font-semibold">
            Margin in similar seasons
          </h2>{" "}
          <ProvenanceTag {...margin} />
        </CardTitle>
        <CardDescription>{marginSubtitle(margin)}</CardDescription>
        <CardAction>
          <ToggleGroup
            size="sm"
            variant="outline"
            value={[view]}
            onValueChange={([next]) => {
              if (next === "chart" || next === "table") setView(next)
            }}
            aria-label="View"
          >
            <ToggleGroupItem value="chart" className={TOGGLE_ON}>
              Chart
            </ToggleGroupItem>
            <ToggleGroupItem value="table" className={TOGGLE_ON}>
              Table
            </ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>

      <CardContent>
        {view === "chart" ? (
          <Chart
            summaries={summaries}
            scale={scale}
            nSimilar={nSimilar}
            nOther={data.seasons.length - nSimilar}
            mock={mock}
            onSelectSeason={onSelectSeason}
          />
        ) : (
          <MarginTable
            data={data}
            mock={mock}
            onSelectSeason={onSelectSeason}
          />
        )}
      </CardContent>
    </Card>
  )
}

const pct = (v: number, [min, max]: [number, number]) =>
  ((v - min) / (max - min)) * 100

function Chart({
  summaries,
  scale,
  nSimilar,
  nOther,
  mock,
  onSelectSeason,
}: {
  summaries: ReadonlyArray<readonly [Strategy, StrategySummary]>
  scale: { domain: [number, number]; step: number }
  nSimilar: number
  nOther: number
  mock: boolean
  onSelectSeason: Select
}) {
  const ts = ticks(scale.domain, scale.step)
  const rows = summaries.length
  return (
    <div className="flex flex-col gap-3">
      <div className={cn("grid gap-x-6", COLS)}>
        <div
          className="hidden pb-2 text-xs text-muted-foreground lg:grid lg:grid-cols-subgrid"
          style={{ gridColumn: "1 / -1", gridRow: 1 }}
          aria-hidden
        >
          <span>Strategy</span>
          <span>Median</span>
          <Legend nSimilar={nSimilar} nOther={nOther} />
        </div>
        {/* One set of gridlines behind every row (wide layout). */}
        <div
          aria-hidden
          className="pointer-events-none relative hidden lg:col-start-3 lg:block"
          style={{ gridRow: `2 / ${rows + 3}` }}
        >
          {ts.map((t) => (
            <span
              key={t}
              className="absolute inset-y-0 w-px bg-(--viz-grid)"
              style={{ left: `${pct(t, scale.domain)}%` }}
            />
          ))}
        </div>
        {summaries.map(([s, sum], i) => (
          <Row
            key={s.strategy_id}
            strategy={s}
            summary={sum}
            scale={scale}
            ticks={ts}
            first={i === 0}
            gridRow={i + 2}
            mock={mock}
            onSelectSeason={onSelectSeason}
          />
        ))}
        <div
          className="lg:col-start-3"
          style={{ gridRow: rows + 2 }}
          aria-hidden
        >
          <Axis domain={scale.domain} ticks={ts} />
        </div>
      </div>
      <div className="lg:hidden">
        <Legend nSimilar={nSimilar} nOther={nOther} />
      </div>
    </div>
  )
}

function Legend({ nSimilar, nOther }: { nSimilar: number; nOther: number }) {
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-(--viz-similar)" /> {nSimilar}{" "}
        similar seasons
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-(--viz-other)" /> {nOther}{" "}
        other seasons
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-[3px] rounded-full bg-(--viz-median)" /> median
        of similar
      </span>
    </span>
  )
}

function Row({
  strategy,
  summary,
  scale,
  ticks: ts,
  first,
  gridRow,
  mock,
  onSelectSeason,
}: {
  strategy: Strategy
  summary: StrategySummary
  scale: { domain: [number, number]; step: number }
  ticks: number[]
  first: boolean
  gridRow: number
  mock: boolean
  onSelectSeason: Select
}) {
  const noMargins = summary.n === 0
  return (
    <div
      className={cn(
        "grid gap-x-6 gap-y-3 py-4 lg:col-span-3 lg:grid-cols-subgrid lg:items-center",
        !first && "border-t border-foreground/8"
      )}
      // Explicit column so rows can overlap the gridline layer instead of being pushed aside.
      style={{ gridRow, gridColumn: "1 / -1" }}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium [overflow-wrap:anywhere]">
            {strategy.name}
          </h3>
          {strategy.is_current && (
            <Badge variant="secondary" className="bg-foreground/8">
              Current
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground [overflow-wrap:anywhere]">
          {strategy.sequence.join(" → ")}
        </p>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-2 lg:block">
        <p className="text-2xl font-semibold tracking-tight tabular-nums">
          {usd(summary.median)}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {noMargins ? (
            summary.nSimilar > 0 ? (
              "no margin in similar seasons"
            ) : (
              "no similar seasons"
            )
          ) : (
            <>
              worst {usd(summary.worst?.value)} · {summary.worst?.season_id}
              {summary.n < summary.nSimilar && (
                <span className="block">
                  median of {summary.n} of {summary.nSimilar}
                </span>
              )}
            </>
          )}
        </p>
      </div>

      <DotStrip
        strategy={strategy}
        summary={summary}
        scale={scale}
        ticks={ts}
        mock={mock}
        onSelectSeason={onSelectSeason}
      />
    </div>
  )
}

/** Deterministic small vertical spread for the recessive gray dots. */
const jitter = (id: string) => {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0
  return ((Math.abs(h) % 7) - 3) * 2.5
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

function DotStrip({
  strategy,
  summary,
  scale,
  ticks: ts,
  mock,
  onSelectSeason,
}: {
  strategy: Strategy
  summary: StrategySummary
  scale: { domain: [number, number]; step: number }
  ticks: number[]
  mock: boolean
  onSelectSeason: Select
}) {
  const [ref, width] = useWidth<HTMLFieldSetElement>()
  const others = summary.points.filter((p) => !p.similar)
  const similar = summary.points.filter((p) => p.similar)
  const offsets = useMemo(
    () =>
      swarmOffsets(
        similar.map((p) => (pct(p.value, scale.domain) / 100) * width)
      ),
    [similar, scale.domain, width]
  )
  const tag = mock ? " (mock)" : ""
  return (
    <fieldset
      ref={ref}
      className="relative h-14 min-w-0"
      aria-label={`${strategy.name}: margin in each past season${tag}. Median of similar seasons ${usd(summary.median)}.`}
    >
      {ts.map((t) => (
        <span
          key={t}
          aria-hidden
          className="absolute inset-y-1 w-px bg-(--viz-grid) lg:hidden"
          style={{ left: `${pct(t, scale.domain)}%` }}
        />
      ))}
      {others.map((p) => (
        <OtherDot
          key={p.season_id}
          point={p}
          domain={scale.domain}
          tag={tag}
          onSelectSeason={onSelectSeason}
        />
      ))}
      {similar.map((p, i) => (
        <SimilarDot
          key={p.season_id}
          point={p}
          domain={scale.domain}
          offset={offsets[i] ?? 0}
          strategy={strategy.name}
          tag={tag}
          onSelectSeason={onSelectSeason}
        />
      ))}
      {summary.median !== null && (
        <Tooltip>
          <TooltipTrigger
            render={
              <span
                className="absolute top-1/2 z-20 h-10 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--viz-median) ring-1 ring-(--viz-ring)"
                style={{ left: `${pct(summary.median, scale.domain)}%` }}
              />
            }
          />
          <TooltipContent>
            Median of similar seasons: {usd(summary.median)}
            {tag}
          </TooltipContent>
        </Tooltip>
      )}
    </fieldset>
  )
}

function SimilarDot({
  point,
  domain,
  offset,
  strategy,
  tag,
  onSelectSeason,
}: {
  point: SeasonPoint
  domain: [number, number]
  offset: number
  strategy: string
  tag: string
  onSelectSeason: Select
}) {
  const label = `${point.season_id}: ${usd(point.value)}${tag}`
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={`${strategy}, ${label}. Open season details`}
            onClick={(e) => onSelectSeason(point.season_id, e.currentTarget)}
            style={{
              left: `${pct(point.value, domain)}%`,
              top: `calc(50% + ${offset}px)`,
            }}
            // The button is the hit target; the visible dot is drawn inside it.
            className={cn(
              "group absolute z-10 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full",
              FOCUS
            )}
          />
        }
      >
        <span className="size-2.5 rounded-full bg-(--viz-similar) ring-2 ring-(--viz-ring) transition group-hover:scale-125" />
      </TooltipTrigger>
      <TooltipContent>{label} · similar season</TooltipContent>
    </Tooltip>
  )
}

/** Gray dots: the mouse can open them; keyboard and screen readers reach them through the table's "All seasons". */
function OtherDot({
  point,
  domain,
  tag,
  onSelectSeason,
}: {
  point: SeasonPoint
  domain: [number, number]
  tag: string
  onSelectSeason: Select
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={(e) => onSelectSeason(point.season_id, e.currentTarget)}
            style={{
              left: `${pct(point.value, domain)}%`,
              top: `calc(50% + ${jitter(point.season_id)}px)`,
            }}
            className="group absolute flex size-3.5 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center"
          />
        }
      >
        <span className="size-1.5 rounded-full bg-(--viz-other) transition group-hover:scale-150" />
      </TooltipTrigger>
      <TooltipContent>
        {point.season_id}: {usd(point.value)}
        {tag}
      </TooltipContent>
    </Tooltip>
  )
}

function Axis({
  domain,
  ticks: ts,
}: {
  domain: [number, number]
  ticks: number[]
}) {
  return (
    <div className="relative h-4 text-xs text-muted-foreground tabular-nums">
      {ts.map((t) => {
        const x = pct(t, domain)
        // Labels near the edges align inward so they stay inside the card.
        const align =
          x < 6 ? "" : x > 94 ? "-translate-x-full" : "-translate-x-1/2"
        return (
          <span
            key={t}
            className={`absolute whitespace-nowrap ${align}`}
            style={{ left: `${x}%` }}
          >
            {usd(t)}
          </span>
        )
      })}
    </div>
  )
}

function MarginTable({
  data,
  mock,
  onSelectSeason,
}: {
  data: SeasonDashboard
  mock: boolean
  onSelectSeason: Select
}) {
  const [all, setAll] = useState(false)
  const similar = data.seasons.filter((s) => s.is_similar)
  const rows = all ? data.seasons : similar
  const tag = mock ? " (mock)" : ""
  return (
    <div className="flex flex-col gap-3">
      <ToggleGroup
        size="sm"
        variant="outline"
        value={[all ? "all" : "similar"]}
        onValueChange={([next]) => {
          if (next) setAll(next === "all")
        }}
        aria-label="Seasons"
        className="self-start"
      >
        <ToggleGroupItem value="similar" className={TOGGLE_ON}>
          Similar ({similar.length})
        </ToggleGroupItem>
        <ToggleGroupItem value="all" className={TOGGLE_ON}>
          All ({data.seasons.length})
        </ToggleGroupItem>
      </ToggleGroup>
      <div className="-mx-2 overflow-x-auto">
        <Table className="tabular-nums">
          <TableCaption className="sr-only">
            Margin by season and strategy, USD per hectare{tag}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="px-2">Season</TableHead>
              <TableHead className="hidden px-2 sm:table-cell">
                ONI {data.similarity.oni_window.label}
              </TableHead>
              {data.strategies.map((s) => (
                <TableHead
                  key={s.strategy_id}
                  className="px-2 text-right whitespace-normal"
                >
                  {s.name}
                  {s.is_current && (
                    <span className="text-muted-foreground"> · current</span>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow
                key={s.season_id}
                className={cn(all && s.is_similar && "bg-(--viz-similar)/8")}
              >
                <TableCell className="px-2">
                  <button
                    type="button"
                    className={cn(
                      "rounded font-medium underline-offset-4 hover:underline",
                      FOCUS
                    )}
                    onClick={(e) =>
                      onSelectSeason(s.season_id, e.currentTarget)
                    }
                  >
                    {s.season_id}
                  </button>
                  {all && s.is_similar && (
                    <span className="sr-only"> (similar)</span>
                  )}
                </TableCell>
                <TableCell className="hidden px-2 text-muted-foreground sm:table-cell">
                  {signed(s.oni)}
                </TableCell>
                {data.strategies.map((st) => (
                  <TableCell key={st.strategy_id} className="px-2 text-right">
                    {usd(st.margin.by_season[s.season_id])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            <TableRow className="font-semibold">
              <TableCell className="px-2">Median, similar{tag}</TableCell>
              <TableCell className="hidden sm:table-cell" />
              {data.strategies.map((st) => (
                <TableCell key={st.strategy_id} className="px-2 text-right">
                  {usd(
                    median(similar.map((s) => st.margin.by_season[s.season_id]))
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
