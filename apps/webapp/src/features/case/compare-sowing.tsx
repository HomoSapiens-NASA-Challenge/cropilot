import type { CaseBundle, WaterBlock } from "@cropilot/api"
import { cn } from "cn"
import { CropSwatch } from "@/components/crop-swatch"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatShare } from "@/features/case/case-format"
import { ComparisonRow, strategyLabel } from "@/features/case/compare-layout"
import { EvidenceChip } from "@/features/case/evidence-chip"

const LIST = new Intl.ListFormat("en", { style: "long", type: "conjunction" })
const SHORT_DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
})

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  const upper = sorted[middle]
  const lower = sorted[Math.ceil(sorted.length / 2) - 1]
  if (upper === undefined || lower === undefined) {
    throw new Error("Sowing window needs at least one analog campaign")
  }
  return (lower + upper) / 2
}

function shiftLabel(days: number): string {
  return days === 0
    ? "on the default date"
    : `${Math.abs(days)} days ${days < 0 ? "earlier" : "later"}`
}

function bestShiftLabel(shifts: number[]): string {
  if (shifts.length > 1 && shifts.every((shift) => shift < 0)) {
    const days = shifts.map(Math.abs)
    return `${Math.min(...days)} to ${Math.max(...days)} days earlier`
  }
  return LIST.format(shifts.map(shiftLabel))
}

/** First summer crop only, at the released default soil starting point. */
export function computeSowingWindows(water: WaterBlock) {
  const shifts = [...water.summer_shift_days].sort((a, b) => a - b)
  const episodes = water.episodes.filter(
    (episode) =>
      episode.scenario_id?.startsWith("analog:") &&
      episode.depth_m === water.default_depth_m &&
      episode.initial_water_fraction === water.default_initial_water_fraction
  )
  const windows = [
    ...new Set(episodes.map((episode) => episode.strategy_id)),
  ].map((strategyId) => {
    const runs = episodes.filter(
      (episode) => episode.strategy_id === strategyId
    )
    const campaigns = [...new Set(runs.map((episode) => episode.scenario_id))]
      .filter((scenarioId) => scenarioId !== null)
      .sort()
    const rows = campaigns.map((scenarioId) => {
      const cells = shifts.map((shift) => {
        const matches = runs.filter(
          (episode) =>
            episode.scenario_id === scenarioId &&
            episode.summer_shift_days === shift
        )
        const summer = matches[0]?.crops.find((crop) => crop.crop !== "Wheat")
        if (matches.length !== 1 || !summer) {
          throw new Error(
            `Missing or duplicate summer run: ${strategyId}, ${scenarioId}, ${shift}`
          )
        }
        return {
          crop: summer.crop,
          stressDays: summer.mid_season_stress_days,
          deficitMm: summer.crop_et_deficit_mm,
          sowingDate: summer.sowing_date,
        }
      })
      return {
        campaign: scenarioId.slice("analog:".length),
        cells,
        minimum: Math.min(...cells.map((cell) => cell.stressDays)),
      }
    })
    const crop = rows[0]?.cells[0]?.crop
    if (
      !crop ||
      rows.some((row) => row.cells.some((cell) => cell.crop !== crop))
    ) {
      throw new Error(
        `Inconsistent summer crop for sowing window: ${strategyId}`
      )
    }
    const columns = shifts.map((shift, index) => {
      const cells = rows.map((row) => {
        const cell = row.cells[index]
        if (!cell) throw new Error(`Missing sowing shift: ${shift}`)
        return cell
      })
      const dayOfYear = median(
        cells.map((cell) => {
          const date = new Date(`${cell.sowingDate}T00:00:00Z`)
          return (
            (date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86400000
          )
        })
      )
      return {
        shift,
        typicalDate: SHORT_DATE.format(new Date(Date.UTC(2001, 0, dayOfYear))),
        medianStressDays: median(cells.map((cell) => cell.stressDays)),
        medianDeficitMm: median(cells.map((cell) => cell.deficitMm)),
        fewestCount: cells.filter(
          (cell, rowIndex) => cell.stressDays === rows[rowIndex]?.minimum
        ).length,
      }
    })
    const minimumMedian = Math.min(
      ...columns.map((column) => column.medianStressDays)
    )
    const best = columns.filter(
      (column) => column.medianStressDays === minimumMedian
    )
    const defaultColumn = columns.find((column) => column.shift === 0)
    if (!defaultColumn) throw new Error("Sowing window needs the default date")
    const topCount = Math.max(...columns.map((column) => column.fewestCount))
    const mostOften = columns.filter(
      (column) => column.fewestCount === topCount
    )
    const headline = `Sowing ${crop.toLowerCase()} ${bestShiftLabel(best.map((column) => column.shift))} had the fewest median stress days at the critical stage: ${minimumMedian}${best.some((column) => column.shift === 0) ? "." : `, against ${defaultColumn.medianStressDays} on the default date.`} ${topCount < rows.length ? "No date held up best every year: " : ""}${LIST.format(mostOften.map((column) => shiftLabel(column.shift)))} ${mostOften.length > 1 ? "each did" : "did"} in ${topCount} of ${rows.length} campaigns.`
    return {
      crop,
      strategyIds: [strategyId],
      rows,
      columns,
      minimumMedian,
      topCount,
      headline,
    }
  })
  // Later seasons can differ while the entire first-season window is shared.
  const grouped = new Map<string, (typeof windows)[number]>()
  for (const window of windows) {
    const key = JSON.stringify({ crop: window.crop, rows: window.rows })
    const existing = grouped.get(key)
    if (existing) existing.strategyIds.push(...window.strategyIds)
    else grouped.set(key, window)
  }
  return [...grouped.values()]
}

export function SowingWindow({ bundle }: { bundle: CaseBundle }) {
  const water = bundle.compare.water
  if (!water) return null
  const windows = computeSowingWindows(water)
  if (windows.length === 0) return null

  return (
    <div className="min-w-0 max-w-full overflow-hidden">
      <ComparisonRow
        title="Sowing window"
        description="Which summer sowing date held up best in the campaigns that started like this one, by days of water stress at the crop's critical stage."
        evidence={
          <EvidenceChip
            meta={water.meta}
            scaleLabel={`Footprint ${water.field_id}`}
            horizon="First summer crop of each analog campaign"
          />
        }
      >
        {windows.map((window) => (
          <Card
            key={window.strategyIds.join(",")}
            className="min-w-0 max-w-full"
            size="sm"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CropSwatch crop={window.crop} />
                {window.crop}
              </CardTitle>
              <p className="text-muted-foreground">
                In a season like this,{" "}
                {LIST.format(
                  window.strategyIds.map((id) =>
                    strategyLabel(bundle.compare.strategies, id)
                  )
                )}{" "}
                {window.strategyIds.length > 1 ? "all start" : "starts"} with{" "}
                {window.crop.toLowerCase()}, so{" "}
                {window.strategyIds.length > 1 ? "they share" : "it has"} this
                window.
              </p>
              <p>{window.headline}</p>
              <p className="text-xs text-muted-foreground">
                Stress days: days of water stress in the crop’s mid-season
                (critical) stage. Shaded cells have the fewest stress days; ties
                are included. Dates use the median day-of-year.
              </p>
            </CardHeader>
            <Table
              aria-label={`${window.crop} sowing window: stress days by analog campaign`}
              className="min-w-[720px] tabular-nums"
            >
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Campaign</TableHead>
                  {window.columns.map((column) => (
                    <TableHead
                      key={column.shift}
                      scope="col"
                      className="text-right"
                    >
                      <span className="block first-letter:uppercase">
                        {shiftLabel(column.shift)}
                      </span>
                      <span className="font-normal text-muted-foreground">
                        {column.typicalDate}
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {window.rows.map((row) => (
                  <TableRow key={row.campaign}>
                    <TableHead scope="row">{row.campaign}</TableHead>
                    {row.cells.map((cell, index) => (
                      <TableCell
                        key={window.columns[index]?.shift}
                        className={cn(
                          "text-right",
                          cell.stressDays === row.minimum &&
                            "bg-muted font-medium"
                        )}
                      >
                        {cell.stressDays}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                <TableRow>
                  <TableHead scope="row">Median</TableHead>
                  {window.columns.map((column) => (
                    <TableCell
                      key={column.shift}
                      className={cn(
                        "text-right",
                        column.medianStressDays === window.minimumMedian &&
                          "bg-muted font-medium"
                      )}
                    >
                      {column.medianStressDays}
                      <span className="block text-xs font-normal text-muted-foreground">
                        Median deficit {column.medianDeficitMm.toFixed(1)} mm
                      </span>
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableHead scope="row">Fewest stress days</TableHead>
                  {window.columns.map((column) => (
                    <TableCell
                      key={column.shift}
                      className={cn(
                        "text-right",
                        column.fewestCount === window.topCount &&
                          "bg-muted font-medium"
                      )}
                    >
                      {column.fewestCount} of {window.rows.length}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        ))}
        <p className="text-xs text-muted-foreground">
          One reference footprint ({water.field_id}) of {bundle.zone_name},{" "}
          {water.default_depth_m} m of soil starting{" "}
          {water.default_initial_water_fraction === 0.5
            ? "half full"
            : `${formatShare(water.default_initial_water_fraction)} full`}
          , NASA POWER weather. Not a sowing recommendation: check soil
          temperature, waterlogging and the cultivar on the lot.
        </p>
      </ComparisonRow>
    </div>
  )
}
