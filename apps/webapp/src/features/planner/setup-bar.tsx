import type { PriorityWeights, Region, RotationPlanSetup } from "@cropilot/api"
import { Pencil, RotateCcw } from "lucide-react"
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/segmented-control"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  ENSO_LABEL,
  formatShare,
  formatWhole,
} from "@/features/planner/planner-format"
import {
  HORIZONS,
  PRESETS,
  type PresetId,
  presetOf,
} from "@/features/planner/planner-outcomes"
import type { Situation } from "@/features/planner/planner-situation"

type PresetChoice = PresetId | "custom"

const PRESET_OPTIONS: ReadonlyArray<SegmentedOption<PresetChoice>> =
  PRESETS.map((preset) => ({ value: preset.id, label: preset.label }))

const HORIZON_OPTIONS: ReadonlyArray<SegmentedOption<string>> = HORIZONS.map(
  (horizon) => ({
    value: String(horizon.campaigns),
    label: String(horizon.campaigns),
  })
)

/**
 * The wizard once a run exists: what was chosen, as chips, with the priorities and the horizon
 * still at hand. Changing either re-runs the planner at once.
 */
export function SetupBar({
  region,
  setup,
  situation,
  weights,
  horizon,
  onPreset,
  onHorizon,
  onEdit,
  onRunAgain,
}: {
  region: Region
  setup: RotationPlanSetup
  situation: Situation
  weights: PriorityWeights
  horizon: number
  onPreset: (weights: PriorityWeights) => void
  onHorizon: (horizon: number) => void
  onEdit: () => void
  onRunAgain: () => void
}) {
  const activePreset: PresetChoice = presetOf(weights) ?? "custom"

  return (
    <Card className="gap-4 sm:[--card-spacing:--spacing(6)]">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-(--card-spacing)">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm font-medium">Your setup</span>
          <Badge variant="outline">
            Soil water {formatShare(situation.waterFraction)} (
            {formatWhole(situation.waterFraction * setup.soil_capacity_mm)} mm)
          </Badge>
          <Badge variant="outline">
            June: {ENSO_LABEL[situation.ensoJune]}
          </Badge>
          <Badge variant="outline">
            August:{" "}
            {situation.ensoAugust
              ? ENSO_LABEL[situation.ensoAugust]
              : "not known yet"}
          </Badge>
          {activePreset === "custom" && (
            <Badge variant="outline">Custom priorities</Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={onEdit}>
            <Pencil aria-hidden data-icon="inline-start" />
            Edit setup
          </Button>
          <Button variant="outline" onClick={onRunAgain}>
            <RotateCcw aria-hidden data-icon="inline-start" />
            Run again
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4 border-t px-(--card-spacing) pt-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">Priorities</span>
          <SegmentedControl
            label="Priority presets"
            value={activePreset}
            options={PRESET_OPTIONS}
            onChange={(choice) => {
              const preset = PRESETS.find(
                (candidate) => candidate.id === choice
              )
              if (preset) onPreset(preset.weights)
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">
            Campaigns planned ahead
          </span>
          <SegmentedControl
            label="Campaigns planned ahead"
            value={String(horizon)}
            options={HORIZON_OPTIONS}
            onChange={(choice) => onHorizon(Number(choice))}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Changing either one runs the planner again.
        </p>
      </div>
      {region.known_limit && (
        <p className="border-t px-(--card-spacing) pt-4 text-xs text-muted-foreground">
          Simulated for {region.name}. {region.known_limit}
        </p>
      )}
    </Card>
  )
}
