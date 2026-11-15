import type { DecisionCell, RotationPlanResult } from "@cropilot/api"
import { cn } from "cn"
import { type FocusEvent, type MouseEvent, useRef, useState } from "react"
import {
  ACTION_CROP,
  ACTION_LABEL,
  ACTION_ORDER,
  ACTION_SHORT,
  ENSO_LABEL,
  ENSO_ORDER,
  formatShare,
} from "@/features/planner/planner-format"
import type { Action } from "@/features/planner/planner-types"
import { ResultSection } from "@/features/planner/result-section"
import { CROPS } from "@/lib/data-colors"

const TOOLTIP_WIDTH_PX = 224
const ROW_LABEL_WIDTH_PX = 56

type ActiveCell = { cell: DecisionCell; left: number; top: number }

function cellKey(cell: DecisionCell): string {
  return `${cell.enso}-${cell.water_fraction}`
}

function CellTooltip({ cell }: { cell: DecisionCell }) {
  return (
    <div className="flex flex-col gap-1.5 text-xs">
      <span className="text-sm font-medium">
        {ENSO_LABEL[cell.enso]}, soil water on June 1{" "}
        {formatShare(cell.water_fraction)}
      </span>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        <dt className="text-muted-foreground">Exact optimum</dt>
        <dd className="text-right">{ACTION_LABEL[cell.optimal_action]}</dd>
        <dt className="text-muted-foreground">Learning agent</dt>
        <dd className="text-right">{ACTION_LABEL[cell.agent_action]}</dd>
      </dl>
      <p className="text-muted-foreground">
        {cell.agrees
          ? "The agent agrees with the optimum here."
          : "The agent disagrees with the optimum here."}
      </p>
      <p className="border-t pt-1.5 text-muted-foreground">
        {cell.training_campaigns} training campaigns in this El Niño phase.
      </p>
    </div>
  )
}

/** One heat map: soil water across, El Niño phase down, the crop the optimum chooses as color. */
function DecisionGrid({
  title,
  lead,
  cells,
  soilCapacityMm,
}: {
  title: string
  lead: string
  cells: ReadonlyArray<DecisionCell>
  soilCapacityMm: number
}) {
  const [active, setActive] = useState<ActiveCell | null>(null)

  const waterLevels = [
    ...new Set(cells.map((cell) => cell.water_fraction)),
  ].sort((a, b) => a - b)
  const byKey = new Map(cells.map((cell) => [cellKey(cell), cell]))

  const containerRef = useRef<HTMLDivElement>(null)

  const show = (target: HTMLElement, cell: DecisionCell) => {
    const maxLeft = Math.max(
      (containerRef.current?.clientWidth ?? 0) - TOOLTIP_WIDTH_PX,
      0
    )
    const centered =
      target.offsetLeft + target.offsetWidth / 2 - TOOLTIP_WIDTH_PX / 2
    setActive({
      cell,
      left: Math.min(Math.max(centered, 0), maxLeft),
      top: target.offsetTop,
    })
  }

  const handlers = (cell: DecisionCell) => ({
    onMouseEnter: (event: MouseEvent<HTMLButtonElement>) =>
      show(event.currentTarget, cell),
    onFocus: (event: FocusEvent<HTMLButtonElement>) =>
      show(event.currentTarget, cell),
    onMouseLeave: () => setActive(null),
    onBlur: () => setActive(null),
  })

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground">{lead}</p>
      </div>
      <div ref={containerRef} className="relative">
        <div
          className="grid gap-0.5"
          style={{
            gridTemplateColumns: `${ROW_LABEL_WIDTH_PX}px repeat(${waterLevels.length}, minmax(0, 1fr))`,
          }}
        >
          {ENSO_ORDER.map((enso) => (
            <div key={enso} className="contents">
              <span className="flex items-center text-xs text-muted-foreground">
                {ENSO_LABEL[enso]}
              </span>
              {waterLevels.map((water) => {
                const cell = byKey.get(`${enso}-${water}`)
                if (!cell) return <span key={water} className="h-8" />
                const crop = ACTION_CROP[cell.optimal_action]
                return (
                  <button
                    key={water}
                    type="button"
                    aria-label={`${ENSO_LABEL[enso]}, soil water ${formatShare(water)}: optimum ${ACTION_LABEL[cell.optimal_action]}, agent ${ACTION_LABEL[cell.agent_action]}`}
                    className={cn(
                      "flex h-8 items-center justify-center rounded-sm text-[10px] font-medium text-foreground",
                      !cell.agrees && "ring-2 ring-inset ring-primary"
                    )}
                    style={{ backgroundColor: CROPS[crop].color }}
                    {...handlers(cell)}
                  >
                    {ACTION_SHORT[cell.optimal_action]}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        <div
          className="mt-1 flex justify-between text-xs text-muted-foreground tabular-nums"
          style={{ paddingLeft: ROW_LABEL_WIDTH_PX + 2 }}
        >
          <span>{formatShare(waterLevels[0] ?? 0)}</span>
          <span>
            Soil water on June 1, % of {Math.round(soilCapacityMm)} mm
          </span>
          <span>{formatShare(waterLevels.at(-1) ?? 1)}</span>
        </div>
        {active && (
          <div
            className="pointer-events-none absolute z-10 -translate-y-full rounded-lg bg-background/75 p-3 shadow-lg ring-1 ring-foreground/10 backdrop-blur-lg"
            style={{
              width: TOOLTIP_WIDTH_PX,
              left: active.left,
              top: active.top - 6,
            }}
          >
            <CellTooltip cell={active.cell} />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * The policy of the first campaign: what the exact optimum plants in each state, and where
 * the learning agent chose differently.
 */
export function DecisionMap({ result }: { result: RotationPlanResult }) {
  const juneCells = result.decisions.filter((cell) => cell.decision === "june")
  const augustCells = result.decisions.filter(
    (cell) => cell.decision === "august"
  )
  const winters = ACTION_ORDER.filter((action) =>
    augustCells.some((cell) => cell.winter === action)
  )
  const shownActions = new Set<Action>(
    result.decisions.map((cell) => cell.optimal_action)
  )
  const shownCrops = [...new Set([...shownActions].map((a) => ACTION_CROP[a]))]

  return (
    <ResultSection
      title="Decision map"
      lead="What the exact optimum plants in the first campaign, state by state. Hover a cell for the agent's choice and the training campaigns behind it."
    >
      <div className="flex flex-col gap-6">
        <div className="grid gap-x-8 gap-y-6 lg:grid-cols-3">
          <DecisionGrid
            title="June: winter crop"
            lead="Before the winter season, by soil water and El Niño phase."
            cells={juneCells}
            soilCapacityMm={result.soil_capacity_mm}
          />
          {winters.map((winter) => (
            <DecisionGrid
              key={winter}
              title={`August after ${ACTION_LABEL[winter].toLowerCase()}: summer crop`}
              lead="Before the summer season, given that winter choice. The August choice does not see August soil water."
              cells={augustCells.filter((cell) => cell.winter === winter)}
              soilCapacityMm={result.soil_capacity_mm}
            />
          ))}
        </div>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
          {shownCrops.map((crop) => (
            <li key={crop} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-3 rounded-sm"
                style={{ backgroundColor: CROPS[crop].color }}
              />
              {CROPS[crop].label}
            </li>
          ))}
          <li>S1 first-crop soybean, S2 second-crop soybean</li>
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-3 rounded-sm ring-2 ring-inset ring-primary"
            />
            The agent chose a different action than the optimum
          </li>
        </ul>
      </div>
    </ResultSection>
  )
}
