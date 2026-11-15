import type { PriorityWeights, RotationPlanSetup } from "@cropilot/api"
import type { ReactNode } from "react"
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/segmented-control"
import {
  ENSO_LABEL,
  formatShare,
  formatWhole,
} from "@/features/planner/planner-format"
import {
  HORIZONS,
  OUTCOMES,
  PRESETS,
  presetOf,
  weightShares,
} from "@/features/planner/planner-outcomes"
import type { Situation } from "@/features/planner/planner-situation"

const HORIZON_OPTIONS: ReadonlyArray<SegmentedOption<string>> = HORIZONS.map(
  (horizon) => ({
    value: String(horizon.campaigns),
    label: String(horizon.campaigns),
  })
)

function ReviewRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

/** The priorities as a sentence: the preset's name, or the shares that carry weight. */
function prioritiesSummary(weights: PriorityWeights): string {
  const presetId = presetOf(weights)
  const preset = PRESETS.find((candidate) => candidate.id === presetId)
  if (preset) return preset.label
  const shares = weightShares(weights)
  const weighted = OUTCOMES.filter((outcome) => shares[outcome.id] > 0)
    .map(
      (outcome) =>
        `${outcome.shortLabel.toLowerCase()} ${formatShare(shares[outcome.id])}`
    )
    .join(", ")
  return `Custom: ${weighted}`
}

/** Step 3: how far ahead to plan, and a last look at the three choices before the run. */
export function WizardHorizonStep({
  setup,
  situation,
  weights,
  horizon,
  onHorizonChange,
}: {
  setup: RotationPlanSetup
  situation: Situation
  weights: PriorityWeights
  horizon: number
  onHorizonChange: (horizon: number) => void
}) {
  const chosen = HORIZONS.find((candidate) => candidate.campaigns === horizon)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium">Campaigns planned ahead</span>
        <SegmentedControl
          label="Campaigns planned ahead"
          value={String(horizon)}
          options={HORIZON_OPTIONS}
          onChange={(choice) => onHorizonChange(Number(choice))}
        />
        {chosen && (
          <p className="text-xs text-muted-foreground">{chosen.description}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Your setup</h3>
        <dl className="divide-y rounded-xl border px-4">
          <ReviewRow label="Starting point">
            Soil water {formatShare(situation.waterFraction)} of capacity (
            {formatWhole(situation.waterFraction * setup.soil_capacity_mm)} mm),{" "}
            {ENSO_LABEL[situation.ensoJune]} in June,{" "}
            {situation.ensoAugust
              ? `${ENSO_LABEL[situation.ensoAugust]} in August`
              : "August not known yet"}
            . Read from the finished plan; it does not change the run.
          </ReviewRow>
          <ReviewRow label="Priorities">{prioritiesSummary(weights)}</ReviewRow>
          <ReviewRow label="Planned ahead">
            {horizon} {horizon === 1 ? "campaign" : "campaigns"}
          </ReviewRow>
        </dl>
      </div>
    </div>
  )
}
