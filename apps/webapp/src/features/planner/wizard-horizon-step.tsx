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
import { translate, useI18n } from "@/lib/i18n"

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
  const { t } = useI18n("app")

  return (
    <div className="flex flex-col gap-1 py-3 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{t(label)}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

/** The priorities as a sentence: the preset's name, or the shares that carry weight. */
function prioritiesSummary(weights: PriorityWeights): string {
  const presetId = presetOf(weights)
  const preset = PRESETS.find((candidate) => candidate.id === presetId)
  if (preset) return translate(preset.label)
  const shares = weightShares(weights)
  const weighted = OUTCOMES.filter((outcome) => shares[outcome.id] > 0)
    .map(
      (outcome) =>
        `${translate(outcome.shortLabel).toLowerCase()} ${formatShare(shares[outcome.id])}`
    )
    .join(", ")
  return translate("Custom: {value1}", { value1: weighted })
}

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
  const { t } = useI18n("app")

  const chosen = HORIZONS.find((candidate) => candidate.campaigns === horizon)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium">
          {t("Campaigns planned ahead")}
        </span>
        <SegmentedControl
          label={t("Campaigns planned ahead")}
          value={String(horizon)}
          options={HORIZON_OPTIONS}
          onChange={(choice) => onHorizonChange(Number(choice))}
        />
        {chosen && (
          <p className="text-xs text-muted-foreground">
            {t(chosen.description)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{t("Your setup")}</h3>
        <dl className="divide-y rounded-xl border px-4">
          <ReviewRow label={t("Starting point")}>
            {t("Soil water ")}
            {formatShare(situation.waterFraction)} {t(" of capacity (")}
            {formatWhole(situation.waterFraction * setup.soil_capacity_mm)}{" "}
            {t(" mm),")} {t(ENSO_LABEL[situation.ensoJune])} {t(" in June,")}{" "}
            {situation.ensoAugust
              ? t("{value1} in August", {
                  value1: t(ENSO_LABEL[situation.ensoAugust]),
                })
              : t("August not known yet")}
            {t(". Read from the finished plan; it does not change the run.")}
          </ReviewRow>
          <ReviewRow label={t("Priorities")}>
            {t(prioritiesSummary(weights))}
          </ReviewRow>
          <ReviewRow label={t("Planned ahead")}>
            {horizon} {horizon === 1 ? t("campaign") : t("campaigns")}
          </ReviewRow>
        </dl>
      </div>
    </div>
  )
}
