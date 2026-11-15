import type { PriorityWeights } from "@cropilot/api"
import { ArrowDown, ArrowUp, LoaderCircle, Play } from "lucide-react"
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/segmented-control"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { formatShare } from "@/features/planner/planner-format"
import {
  OUTCOMES,
  PRESETS,
  presetOf,
  totalWeight,
} from "@/features/planner/planner-outcomes"

const SLIDER_STEP = 0.05
const HORIZONS = [1, 2, 3, 4, 5] as const

type PresetChoice = (typeof PRESETS)[number]["id"] | "custom"

const PRESET_OPTIONS: ReadonlyArray<SegmentedOption<PresetChoice>> =
  PRESETS.map((preset) => ({ value: preset.id, label: preset.label }))

const HORIZON_OPTIONS: ReadonlyArray<SegmentedOption<string>> = HORIZONS.map(
  (horizon) => ({ value: String(horizon), label: String(horizon) })
)

type OutcomeId = (typeof OUTCOMES)[number]["id"]

/** What matters on this farm: five priorities, how far ahead to plan, and the run button. */
export function PrioritiesPanel({
  weights,
  horizon,
  isStarting,
  onWeightChange,
  onWeightCommit,
  onPreset,
  onHorizon,
  onRun,
}: {
  weights: PriorityWeights
  horizon: number
  isStarting: boolean
  onWeightChange: (id: OutcomeId, value: number) => void
  onWeightCommit: (id: OutcomeId, value: number) => void
  onPreset: (weights: PriorityWeights) => void
  onHorizon: (horizon: number) => void
  onRun: () => void
}) {
  const total = totalWeight(weights)
  const hasPriority = total > 0
  const activePreset: PresetChoice = presetOf(weights) ?? "custom"

  return (
    <section
      aria-label="Priorities"
      className="flex flex-col gap-6 rounded-xl border bg-card p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Priorities</span>
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
          <span className="text-sm font-medium">Campaigns planned ahead</span>
          <SegmentedControl
            label="Campaigns planned ahead"
            value={String(horizon)}
            options={HORIZON_OPTIONS}
            onChange={(choice) => onHorizon(Number(choice))}
          />
        </div>
      </div>

      <div className="grid gap-x-10 gap-y-5 md:grid-cols-2">
        {OUTCOMES.map((outcome) => {
          const value = weights[outcome.id]
          const DirectionIcon = outcome.direction === "up" ? ArrowUp : ArrowDown
          return (
            <div key={outcome.id} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label
                  htmlFor={`weight-${outcome.id}`}
                  className="flex items-center gap-1.5 font-medium"
                >
                  <DirectionIcon
                    aria-hidden
                    className="size-3.5 text-muted-foreground"
                  />
                  {outcome.label}
                  <span className="font-normal text-muted-foreground">
                    ({outcome.unit})
                  </span>
                </Label>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {hasPriority ? formatShare(value / total) : "0%"}
                </span>
              </div>
              <Slider
                id={`weight-${outcome.id}`}
                aria-label={`${outcome.label} priority`}
                min={0}
                max={1}
                step={SLIDER_STEP}
                value={[value]}
                onValueChange={(next) =>
                  onWeightChange(
                    outcome.id,
                    typeof next === "number" ? next : (next[0] ?? 0)
                  )
                }
                onValueCommitted={(next) =>
                  onWeightCommit(
                    outcome.id,
                    typeof next === "number" ? next : (next[0] ?? 0)
                  )
                }
              />
              <p className="text-xs text-muted-foreground">{outcome.hint}</p>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t pt-4">
        <p className="max-w-xl text-sm text-muted-foreground">
          {hasPriority
            ? "Shares are relative: only the proportions between the sliders matter. Releasing a slider runs the planner again."
            : "Give at least one outcome some weight to run the planner."}
        </p>
        <Button onClick={onRun} disabled={!hasPriority || isStarting}>
          {isStarting ? (
            <LoaderCircle
              aria-hidden
              data-icon="inline-start"
              className="animate-spin motion-reduce:animate-none"
            />
          ) : (
            <Play aria-hidden data-icon="inline-start" />
          )}
          {isStarting ? "Starting" : "Run planner"}
        </Button>
      </div>
    </section>
  )
}
