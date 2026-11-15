import type { DecisionCell, RotationPlanResult } from "@cropilot/api"
import { cn } from "cn"
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/segmented-control"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ItineraryChip } from "@/features/planner/itinerary-chip"
import {
  ACTION_CROP,
  ACTION_LABEL,
  ENSO_LABEL,
  ENSO_ORDER,
  formatShare,
  formatWhole,
  sourcesById,
} from "@/features/planner/planner-format"
import {
  type AugustBranch,
  type NextCampaign,
  nextCampaign,
  type Situation,
  waterFractionOfLevel,
  waterLevelOfFraction,
} from "@/features/planner/planner-situation"
import type { Action, EnsoPhase } from "@/features/planner/planner-types"
import { ResultSection } from "@/features/planner/result-section"
import { CROPS } from "@/lib/data-colors"

type AugustChoice = EnsoPhase | "unknown"

const LIST = new Intl.ListFormat("en", { style: "long", type: "conjunction" })

const JUNE_OPTIONS: ReadonlyArray<SegmentedOption<EnsoPhase>> = ENSO_ORDER.map(
  (phase) => ({ value: phase, label: ENSO_LABEL[phase] })
)

const AUGUST_OPTIONS: ReadonlyArray<SegmentedOption<AugustChoice>> = [
  { value: "unknown", label: "Not known yet" },
  ...JUNE_OPTIONS,
]

function cropName(action: Action): string {
  return ACTION_LABEL[action].toLowerCase()
}

/** "leaves the winter fallow" or "sows wheat in winter"; the summer crop follows "then". */
function sowing(action: Action, season: "winter" | "summer"): string {
  if (action === "fallow") return `leaves the ${season} fallow`
  return season === "winter"
    ? `sows ${cropName(action)} in winter`
    : `${cropName(action)} in summer`
}

/** The plan in one sentence, composed from the decisions it reads off the map. */
function takeaway(plan: NextCampaign, situation: Situation): string {
  if (!plan.june)
    return "The decision map has no state for this starting point."
  const start = `From ${ENSO_LABEL[situation.ensoJune]} on June 1 with ${formatShare(situation.waterFraction)} soil water, the plan ${sowing(plan.june.optimal_action, "winter")}`
  const known = plan.branches.find((branch) => branch.isKnown)
  if (known?.cell) {
    return `${start}, then ${sowing(known.cell.optimal_action, "summer")} given ${ENSO_LABEL[known.ensoAugust]} in August.`
  }
  const choices = plan.branches.flatMap((branch) =>
    branch.cell ? [{ branch, action: branch.cell.optimal_action }] : []
  )
  const [firstChoice] = choices
  if (
    firstChoice &&
    choices.every((choice) => choice.action === firstChoice.action)
  ) {
    return `${start}, then ${sowing(firstChoice.action, "summer")} whatever August brings.`
  }
  const byPhase = choices.map(
    ({ branch, action }) =>
      `${cropName(action)} after ${ENSO_LABEL[branch.ensoAugust]}`
  )
  return `${start}, then picks the summer crop by the August phase: ${LIST.format(byPhase)}.`
}

function CropSwatch({ action }: { action: Action }) {
  return (
    <span
      aria-hidden
      className="size-3 shrink-0 rounded-sm"
      style={{ backgroundColor: CROPS[ACTION_CROP[action]].color }}
    />
  )
}

function agentNote(cell: DecisionCell): string | null {
  return cell.agrees
    ? null
    : `The learning agent picks ${cropName(cell.agent_action)} here instead.`
}

/** Controls for the starting point; they re-read the finished plan and run nothing. */
function SituationControls({
  result,
  situation,
  onSituationChange,
}: {
  result: RotationPlanResult
  situation: Situation
  onSituationChange: (situation: Situation) => void
}) {
  const levels = result.water_levels
  const millimetres = formatWhole(
    situation.waterFraction * result.soil_capacity_mm
  )

  return (
    <div className="grid gap-x-10 gap-y-6 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <Label htmlFor="next-campaign-soil-water">Soil water on June 1</Label>
          <span className="text-sm tabular-nums">
            <span className="text-xl font-light tracking-tight">
              {formatShare(situation.waterFraction)}
            </span>{" "}
            <span className="text-muted-foreground">
              of capacity, {millimetres} mm
            </span>
          </span>
        </div>
        <Slider
          id="next-campaign-soil-water"
          aria-label="Soil water on June 1"
          min={0}
          max={levels - 1}
          step={1}
          value={[waterLevelOfFraction(situation.waterFraction, levels)]}
          onValueChange={(next) => {
            const chosen = typeof next === "number" ? next : (next[0] ?? 0)
            onSituationChange({
              ...situation,
              waterFraction: waterFractionOfLevel(chosen, levels),
            })
          }}
        />
        <p className="text-xs text-muted-foreground">
          A simulator assumption in {levels} steps of{" "}
          {formatWhole(result.soil_capacity_mm)} mm capacity, not the NASA POWER
          wetness index.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">El Niño phase on June 1</span>
          <SegmentedControl
            label="El Niño phase on June 1"
            value={situation.ensoJune}
            options={JUNE_OPTIONS}
            onChange={(ensoJune) =>
              onSituationChange({ ...situation, ensoJune })
            }
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">
            El Niño phase at the end of August
          </span>
          <SegmentedControl<AugustChoice>
            label="El Niño phase at the end of August"
            value={situation.ensoAugust ?? "unknown"}
            options={AUGUST_OPTIONS}
            onChange={(choice) =>
              onSituationChange({
                ...situation,
                ensoAugust: choice === "unknown" ? null : choice,
              })
            }
          />
        </div>
      </div>
    </div>
  )
}

function JuneTile({ cell }: { cell: DecisionCell }) {
  const note = agentNote(cell)
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border p-4">
      <span className="text-xs text-muted-foreground">June 1: winter crop</span>
      <span className="flex items-center gap-2 text-2xl font-light tracking-tight">
        <CropSwatch action={cell.optimal_action} />
        {ACTION_LABEL[cell.optimal_action]}
      </span>
      <p className="text-xs text-muted-foreground">
        The exact optimum, decided before the August phase is known.
        {note && ` ${note}`}
      </p>
    </div>
  )
}

function BranchTile({
  branch,
  winter,
}: {
  branch: AugustBranch
  winter: Action
}) {
  const { cell } = branch
  const note = cell ? agentNote(cell) : null
  const hasJuneHistory = branch.juneTrainingCampaigns > 0

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-xl border p-4",
        branch.isKnown && "border-foreground"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="text-sm font-medium">
          {ENSO_LABEL[branch.ensoAugust]} in August
        </span>
        {branch.isKnown && <Badge variant="outline">Phase known</Badge>}
      </div>
      {cell ? (
        <span className="flex items-center gap-2 text-2xl font-light tracking-tight">
          <ItineraryChip
            itinerary={{ winter, summer: cell.optimal_action }}
            className="w-6 shrink-0"
          />
          {ACTION_LABEL[cell.optimal_action]}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">
          The map has no decision for this state.
        </span>
      )}
      <p className="text-xs text-muted-foreground">
        {hasJuneHistory ? (
          <>
            <span className="tabular-nums text-foreground">
              {branch.trainingCampaigns} of {branch.juneTrainingCampaigns}
            </span>{" "}
            training campaigns
            {branch.trainingCampaigns === 0
              ? ": none went this way, so the decision rests on every campaign with this August phase."
              : " went this way."}
          </>
        ) : (
          "No training campaign began in this June phase; the model falls back to all of them."
        )}
        {note && ` ${note}`}
      </p>
    </div>
  )
}

/**
 * The first campaign of the plan from the starting point the reader chose: the winter crop on
 * June 1, then the summer crop for each El Niño phase the end of August can bring, with how
 * often training campaigns took each path.
 */
export function NextCampaignCard({
  result,
  situation,
  onSituationChange,
}: {
  result: RotationPlanResult
  situation: Situation
  onSituationChange: (situation: Situation) => void
}) {
  const plan = nextCampaign(result, situation)
  const { june } = plan

  return (
    <ResultSection
      title="Next campaign"
      lead="What the exact optimum does from the starting point you choose: the winter crop on June 1, then the summer crop for each El Niño phase August can bring. Changing these controls only re-reads the plan; nothing runs again."
      sources={sourcesById(result.sources, ["noaa-oni", "nasa-power"])}
    >
      <p className="max-w-3xl text-sm">{takeaway(plan, situation)}</p>

      <SituationControls
        result={result}
        situation={situation}
        onSituationChange={onSituationChange}
      />

      {june && (
        <div className="grid gap-4 border-t pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <JuneTile cell={june} />
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <h3 className="text-sm font-medium">
                End of August: summer crop after {cropName(june.optimal_action)}
              </h3>
              <p className="text-xs text-muted-foreground">
                {situation.ensoAugust
                  ? "The phase you set is outlined."
                  : "The August phase is not known yet, so every branch is shown."}{" "}
                Counts are the training campaigns that began in a{" "}
                {ENSO_LABEL[situation.ensoJune]} June and ended in each August
                phase.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {plan.branches.map((branch) => (
                <BranchTile
                  key={branch.ensoAugust}
                  branch={branch}
                  winter={june.optimal_action}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <p className="max-w-3xl border-t pt-6 text-xs text-muted-foreground">
        A simulated scenario, not a forecast. The August choice reads the soil
        water of June 1, because the August decision does not see August soil
        water.
      </p>
    </ResultSection>
  )
}
