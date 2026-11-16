import type { PriorityWeights } from "@cropilot/api"
import { cn } from "cn"
import { ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { formatShare } from "@/features/planner/planner-format"
import {
  OUTCOMES,
  PRESETS,
  presetOf,
  totalWeight,
  weightShares,
} from "@/features/planner/planner-outcomes"
import { useI18n } from "@/lib/i18n"

const SLIDER_STEP = 0.05

/** Five thin bars, one per outcome, as long as that outcome's share of the weights. */
function ShareBars({ weights }: { weights: PriorityWeights }) {
  const { t } = useI18n("app")

  const shares = weightShares(weights)
  return (
    <ul aria-hidden className="flex flex-col gap-1.5">
      {OUTCOMES.map((outcome) => (
        <li key={outcome.id} className="flex items-center gap-2 text-xs">
          <span className="w-28 shrink-0 truncate text-muted-foreground">
            {t(outcome.shortLabel)}
          </span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: `${shares[outcome.id] * 100}%` }}
            />
          </span>
          <span className="w-9 shrink-0 text-right tabular-nums text-muted-foreground">
            {formatShare(shares[outcome.id])}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function WizardPrioritiesStep({
  weights,
  onWeightsChange,
}: {
  weights: PriorityWeights
  onWeightsChange: (weights: PriorityWeights) => void
}) {
  const { t } = useI18n("app")

  const total = totalWeight(weights)
  const hasPriority = total > 0
  const activePreset = presetOf(weights)
  const shares = weightShares(weights)

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">{t("Priority presets")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {PRESETS.map((preset) => {
            const isActive = activePreset === preset.id
            return (
              <label
                key={preset.id}
                className={cn(
                  "flex cursor-pointer flex-col gap-4 rounded-xl border bg-card p-4 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50 motion-reduce:transition-none",
                  isActive ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                )}
              >
                <input
                  type="radio"
                  name="priority-preset"
                  value={preset.id}
                  checked={isActive}
                  onChange={() => onWeightsChange(preset.weights)}
                  className="sr-only"
                />
                <span className="flex flex-1 flex-col gap-1">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isActive && "text-primary"
                    )}
                  >
                    {t(preset.label)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t(preset.description)}
                  </span>
                </span>
                <ShareBars weights={preset.weights} />
              </label>
            )
          })}
        </div>
      </fieldset>

      <Collapsible className="flex flex-col gap-4 rounded-xl border p-4">
        <CollapsibleTrigger className="group/trigger flex w-full items-center justify-between gap-3 rounded-lg text-left text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <span className="flex items-center gap-2">
            {t("Fine-tune")}
            {activePreset === null && (
              <Badge variant="outline">{t("Custom")}</Badge>
            )}
          </span>
          <ChevronDown
            aria-hidden
            className="size-4 text-muted-foreground transition-transform group-data-panel-open/trigger:rotate-180 motion-reduce:transition-none"
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col gap-6">
          <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
            {OUTCOMES.map((outcome) => (
              <div key={outcome.id} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <Label
                    htmlFor={`weight-${outcome.id}`}
                    className="flex flex-wrap items-center gap-x-1.5"
                  >
                    {t(outcome.label)}
                    <span className="font-normal text-muted-foreground">
                      ({t(outcome.unit)})
                    </span>
                  </Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatShare(shares[outcome.id])}
                  </span>
                </div>
                <Slider
                  id={`weight-${outcome.id}`}
                  aria-label={t("{value1} priority", {
                    value1: t(outcome.label),
                  })}
                  min={0}
                  max={1}
                  step={SLIDER_STEP}
                  value={[weights[outcome.id]]}
                  onValueChange={(next) =>
                    onWeightsChange({
                      ...weights,
                      [outcome.id]:
                        typeof next === "number" ? next : (next[0] ?? 0),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t(outcome.hint)}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {t(
              "Shares are relative: only the proportions between the sliders matter."
            )}
          </p>
        </CollapsibleContent>
      </Collapsible>

      {!hasPriority && (
        <p role="status" className="text-sm text-muted-foreground">
          {t("Give at least one outcome some weight to continue.")}
        </p>
      )}
    </div>
  )
}
