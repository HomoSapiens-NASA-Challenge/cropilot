import type { Region, RotationPlanSetup } from "@cropilot/api"
import { Info, RotateCcw } from "lucide-react"
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/segmented-control"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ItineraryChip } from "@/features/planner/itinerary-chip"
import {
  describeEnsoReading,
  ENSO_LABEL,
  ENSO_ORDER,
  formatShare,
  formatWhole,
  itineraryLabel,
  sourcesById,
} from "@/features/planner/planner-format"
import {
  defaultSituation,
  type Situation,
  waterFractionOfLevel,
  waterLevelOfFraction,
} from "@/features/planner/planner-situation"
import type { EnsoPhase } from "@/features/planner/planner-types"

type AugustChoice = EnsoPhase | "unknown"

const JUNE_OPTIONS: ReadonlyArray<SegmentedOption<EnsoPhase>> = ENSO_ORDER.map(
  (phase) => ({ value: phase, label: ENSO_LABEL[phase] })
)

const AUGUST_OPTIONS: ReadonlyArray<SegmentedOption<AugustChoice>> = [
  { value: "unknown", label: "Not known yet" },
  ...JUNE_OPTIONS,
]

function Caption({ children }: { children: string }) {
  return <p className="text-xs text-muted-foreground">{children}</p>
}

/** The soil water slider over the simulator's levels, in % of capacity and in millimetres. */
function SoilWaterControl({
  setup,
  situation,
  onChange,
}: {
  setup: RotationPlanSetup
  situation: Situation
  onChange: (situation: Situation) => void
}) {
  const levels = setup.water_levels
  const level = waterLevelOfFraction(situation.waterFraction, levels)
  const defaultFraction = defaultSituation(setup).waterFraction
  const isDefault = Math.abs(situation.waterFraction - defaultFraction) < 1e-9
  const millimetres = (fraction: number) =>
    formatWhole(fraction * setup.soil_capacity_mm)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Label htmlFor="start-soil-water">Soil water on June 1</Label>
        <span className="text-sm tabular-nums">
          <span className="text-2xl font-light tracking-tight">
            {formatShare(situation.waterFraction)}
          </span>{" "}
          <span className="text-muted-foreground">
            of capacity, {millimetres(situation.waterFraction)} mm
          </span>
        </span>
      </div>
      <Slider
        id="start-soil-water"
        aria-label="Soil water on June 1"
        min={0}
        max={levels - 1}
        step={1}
        value={[level]}
        onValueChange={(next) => {
          const chosen = typeof next === "number" ? next : (next[0] ?? 0)
          onChange({
            ...situation,
            waterFraction: waterFractionOfLevel(chosen, levels),
          })
        }}
      />
      <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
        <span>0%</span>
        <span>100% = {formatWhole(setup.soil_capacity_mm)} mm</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <Caption>
          {isDefault
            ? `The simulator's own assumption: ${formatShare(defaultFraction)} (${millimetres(defaultFraction)} mm) at the start of every campaign. It is not the NASA POWER wetness index.`
            : `Your choice. The simulator assumes ${formatShare(defaultFraction)} (${millimetres(defaultFraction)} mm). Neither is the NASA POWER wetness index.`}
        </Caption>
        {!isDefault && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({ ...situation, waterFraction: defaultFraction })
            }
          >
            <RotateCcw aria-hidden data-icon="inline-start" />
            Use the assumption
          </Button>
        )}
      </div>
    </div>
  )
}

/** Step 1: the region as the simulator sees it, and where the reader says the campaign starts. */
export function WizardStartStep({
  region,
  setup,
  situation,
  onSituationChange,
}: {
  region: Region
  setup: RotationPlanSetup
  situation: Situation
  onSituationChange: (situation: Situation) => void
}) {
  const soilSource = sourcesById(setup.sources, ["soilgrids"])[0]

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-8">
          <SoilWaterControl
            setup={setup}
            situation={situation}
            onChange={onSituationChange}
          />

          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium">El Niño phase on June 1</span>
            <SegmentedControl
              label="El Niño phase on June 1"
              value={situation.ensoJune}
              options={JUNE_OPTIONS}
              onChange={(ensoJune) =>
                onSituationChange({ ...situation, ensoJune })
              }
            />
            <Caption>
              {setup.latest_enso_june
                ? describeEnsoReading(setup.latest_enso_june)
                : "No NOAA reading is installed for the latest campaign: Neutral is a placeholder, change it if you know better."}
            </Caption>
          </div>

          <div className="flex flex-col gap-3">
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
            <Caption>
              {setup.latest_enso_august
                ? describeEnsoReading(setup.latest_enso_august)
                : "NOAA has not published the Jul-Sep reading for the latest campaign."}
            </Caption>
          </div>
        </div>

        <aside
          aria-label={`${region.name} as the simulator sees it`}
          className="flex flex-col gap-5 rounded-xl border p-4"
        >
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium">{region.name}</h3>
            <p className="text-xs text-muted-foreground">
              {region.department}, {region.province}
            </p>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">
              Soil water capacity
            </span>
            <span className="text-3xl font-light tracking-tight tabular-nums">
              {formatWhole(setup.soil_capacity_mm)} mm
            </span>
            {soilSource && (
              <span className="text-xs text-muted-foreground">
                {soilSource.dataset}. {soilSource.location}.
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="text-xs text-muted-foreground">
              Crop sequences the simulator can play here
            </h4>
            <ul className="flex flex-col gap-1.5">
              {setup.itineraries.map((itinerary) => (
                <li
                  key={`${itinerary.winter}-${itinerary.summer}`}
                  className="flex items-center gap-2 text-xs"
                >
                  <ItineraryChip itinerary={itinerary} className="w-6" />
                  {itineraryLabel(itinerary)}
                </li>
              ))}
            </ul>
          </div>
          {setup.unavailable_strategies.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="text-xs text-muted-foreground">
                Not simulated here
              </h4>
              <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                {setup.unavailable_strategies.map((strategy) => (
                  <li key={strategy.strategy_id}>
                    <span className="text-foreground">{strategy.label}</span>:{" "}
                    {strategy.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {region.known_limit && (
            <p className="border-t pt-3 text-xs text-muted-foreground">
              {region.known_limit}
            </p>
          )}
        </aside>
      </div>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        <span>
          These choices do not re-run anything. The plan covers every starting
          state; they only pick the one you read it for.
        </span>
      </p>
    </div>
  )
}
