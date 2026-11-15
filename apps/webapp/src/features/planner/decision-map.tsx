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
  sourcesById,
} from "@/features/planner/planner-format"
import {
  nextCampaign,
  type Situation,
} from "@/features/planner/planner-situation"
import type { Action } from "@/features/planner/planner-types"
import { ResultSection } from "@/features/planner/result-section"
import { CROPS } from "@/lib/data-colors"

const TOOLTIP_WIDTH_PX = 224
const ROW_LABEL_WIDTH_PX = 64
const WATER_TOLERANCE = 1e-9

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
        {cell.training_campaigns} training campaigns in this El Niño phase.{" "}
        Click to read the plan for this state.
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
  isSelected,
  onSelect,
}: {
  title: string
  lead: string
  cells: ReadonlyArray<DecisionCell>
  soilCapacityMm: number
  /** The cell the reader's situation points at, drawn with an outline. */
  isSelected: (cell: DecisionCell) => boolean
  onSelect: (cell: DecisionCell) => void
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
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground">{lead}</p>
      </div>
      <div ref={containerRef} className="relative">
        <div
          className="grid gap-1"
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
                if (!cell) return <span key={water} className="h-10" />
                const crop = ACTION_CROP[cell.optimal_action]
                return (
                  <button
                    key={water}
                    type="button"
                    aria-label={`${ENSO_LABEL[enso]}, soil water ${formatShare(water)}: optimum ${ACTION_LABEL[cell.optimal_action]}, agent ${ACTION_LABEL[cell.agent_action]}`}
                    aria-pressed={isSelected(cell)}
                    className={cn(
                      "flex h-10 items-center justify-center rounded-sm text-[10px] font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      !cell.agrees && "ring-2 ring-inset ring-primary",
                      isSelected(cell) &&
                        "outline-2 outline-offset-2 outline-foreground"
                    )}
                    style={{ backgroundColor: CROPS[crop].color }}
                    onClick={() => onSelect(cell)}
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

/** The June choices in words: what the optimum plants most, and where the agent differs. */
function juneTakeaway(cells: ReadonlyArray<DecisionCell>): string {
  const counts = new Map<Action, number>()
  for (const cell of cells) {
    counts.set(cell.optimal_action, (counts.get(cell.optimal_action) ?? 0) + 1)
  }
  const parts = ACTION_ORDER.filter((action) => counts.has(action))
    .sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))
    .map(
      (action) =>
        `${ACTION_LABEL[action].toLowerCase()} in ${counts.get(action)}`
    )
  const differing = cells.filter((cell) => !cell.agrees).length
  return `In June the exact optimum chooses ${parts.join(", ")} of the ${cells.length} states. The learning agent chooses differently in ${differing}.`
}

/**
 * The policy of the first campaign: what the exact optimum plants in each state, and where
 * the learning agent chose differently. The reader's situation is outlined, and clicking a cell
 * moves it there.
 */
export function DecisionMap({
  result,
  situation,
  onSituationChange,
}: {
  result: RotationPlanResult
  situation: Situation
  onSituationChange: (situation: Situation) => void
}) {
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
  const winterOfSituation = nextCampaign(result, situation).june?.optimal_action

  const isSameWater = (cell: DecisionCell) =>
    Math.abs(cell.water_fraction - situation.waterFraction) < WATER_TOLERANCE

  return (
    <ResultSection
      title="Decision map"
      lead="What the exact optimum plants in the first campaign, state by state. Hover a cell for the agent's choice and the training campaigns behind it; click one to read the plan for that state."
      sources={sourcesById(result.sources, ["nasa-power", "noaa-oni"])}
    >
      <p className="text-sm">{juneTakeaway(juneCells)}</p>

      <DecisionGrid
        title="June: winter crop"
        lead="Before the winter season, by soil water and El Niño phase."
        cells={juneCells}
        soilCapacityMm={result.soil_capacity_mm}
        isSelected={(cell) =>
          cell.enso === situation.ensoJune && isSameWater(cell)
        }
        onSelect={(cell) =>
          onSituationChange({
            ...situation,
            waterFraction: cell.water_fraction,
            ensoJune: cell.enso,
          })
        }
      />

      <div className="grid gap-x-8 gap-y-8 border-t pt-6 lg:grid-cols-2">
        {winters.map((winter) => (
          <DecisionGrid
            key={winter}
            title={`August after ${ACTION_LABEL[winter].toLowerCase()}: summer crop`}
            lead="Before the summer season, given that winter choice. The August choice does not see August soil water."
            cells={augustCells.filter((cell) => cell.winter === winter)}
            soilCapacityMm={result.soil_capacity_mm}
            isSelected={(cell) =>
              winter === winterOfSituation &&
              cell.enso === situation.ensoAugust &&
              isSameWater(cell)
            }
            onSelect={(cell) =>
              onSituationChange({
                ...situation,
                waterFraction: cell.water_fraction,
                ensoAugust: cell.enso,
              })
            }
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
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-3 rounded-sm outline-2 outline-offset-2 outline-foreground"
          />
          Your situation
        </li>
      </ul>
    </ResultSection>
  )
}
