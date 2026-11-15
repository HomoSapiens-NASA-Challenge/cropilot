import type {
  CampaignPoint,
  Compare,
  PairedCounts,
  Strategy,
  WaterBlock,
} from "@cropilot/api"
import { useState } from "react"
import { SegmentedControl } from "@/components/segmented-control"
import { NotComputedRow } from "@/features/case/block-frame"
import {
  campaignName,
  formatMm,
  formatShare,
  formatSigned,
} from "@/features/case/case-format"
import {
  ComparisonRow,
  StrategyCell,
  StrategyGrid,
} from "@/features/case/compare-layout"
import { DotStrip, type StripDot, stripDomain } from "@/features/case/dot-strip"
import { EvidenceChip } from "@/features/case/evidence-chip"
import { Term } from "@/features/case/glossary-term"

const WATER_HORIZON = "Three continuous campaigns from June of the start year"

type WaterSettings = {
  depthM: number
  initialWaterFraction: number
  summerShiftDays: number
}

function matchesSettings(
  entry: {
    depth_m: number
    initial_water_fraction: number
    summer_shift_days: number
  },
  settings: WaterSettings
): boolean {
  return (
    entry.depth_m === settings.depthM &&
    entry.initial_water_fraction === settings.initialWaterFraction &&
    entry.summer_shift_days === settings.summerShiftDays
  )
}

function shiftLabel(days: number): string {
  return days === 0
    ? "Default date"
    : `${days > 0 ? "+" : "-"}${Math.abs(days)} days`
}

/** Lower, equal and higher, as one bar and a sentence. Ink for higher, accent for lower. */
function CountsBar({ counts }: { counts: PairedCounts }) {
  const parts = [
    {
      key: "lower",
      label: "Lower",
      count: counts.lower_count,
      className: "bg-primary",
    },
    {
      key: "equal",
      label: "Equal",
      count: counts.equal_count,
      className: "bg-border",
    },
    {
      key: "higher",
      label: "Higher",
      count: counts.higher_count,
      className: "bg-foreground",
    },
  ] as const
  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="img"
        aria-label={parts
          .map((part) => `${part.label} ${part.count}`)
          .join(", ")}
        className="flex h-2 w-full gap-px overflow-hidden rounded-full"
      >
        {parts.map((part) => (
          <span
            key={part.key}
            className={part.className}
            style={{ width: `${(part.count / counts.count) * 100}%` }}
          />
        ))}
      </div>
      <p className="text-sm tabular-nums">
        {parts.map((part) => `${part.label} ${part.count}`).join(" · ")}
        <span className="text-muted-foreground">
          {" "}
          of {counts.count} episodes
        </span>
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        Difference in unmet crop water: median{" "}
        {formatSigned(counts.median_mm, 0)} mm, from{" "}
        {formatSigned(counts.minimum_mm, 0)} to{" "}
        {formatSigned(counts.maximum_mm, 0)} mm.
      </p>
    </div>
  )
}

function WaterCell({
  strategy,
  water,
  settings,
  analogRankByScenario,
  domain,
}: {
  strategy: Strategy
  water: WaterBlock
  settings: WaterSettings
  analogRankByScenario: ReadonlyMap<string, number | null>
  domain: [number, number] | null
}) {
  if (strategy.water_strategy_id === null) {
    return (
      <NotComputedRow
        title="Water"
        reason="Cropilot has no water simulation for this rotation."
      />
    )
  }

  const analogs = water.episodes
    .filter(
      (episode) =>
        episode.strategy_id === strategy.strategy_id &&
        episode.scenario_id !== null &&
        matchesSettings(episode, settings)
    )
    .sort((a, b) => a.start_year - b.start_year)
  const dots: StripDot[] = analogs.map((episode) => {
    const rank = analogRankByScenario.get(episode.scenario_id ?? "")
    return {
      key: episode.run_id,
      value: episode.crop_demand_unmet_fraction,
      description: `${campaignName(episode.start_year)}${rank ? ` (analog ${rank})` : ""}: ${formatShare(episode.crop_demand_unmet_fraction)} of crop water unmet, ${formatMm(episode.crop_et_deficit_mm)}`,
    }
  })

  const isShifted = settings.summerShiftDays !== 0
  const counts = (isShifted ? water.calendar_effects : water.robustness).find(
    (entry) =>
      entry.strategy_id === strategy.strategy_id &&
      entry.depth_m === settings.depthM &&
      entry.initial_water_fraction === settings.initialWaterFraction &&
      entry.summer_shift_days === settings.summerShiftDays
  )

  return (
    <>
      {strategy.water_match === "closest" && (
        <p className="rounded-lg bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
          Closest match: same crops, a different phase of the cycle.
        </p>
      )}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium">
          Unmet <Term term="Crop water deficit">crop water</Term>, analog
          episodes
        </span>
        {dots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No run for these settings.
          </p>
        ) : (
          <DotStrip
            dots={dots}
            domain={domain}
            format={(value) => formatShare(value)}
          />
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium">
          {isShifted
            ? "Against the default sowing date, all episodes"
            : "Against the current rotation, all episodes"}
        </span>
        {strategy.is_current && !isShifted ? (
          <p className="text-sm text-muted-foreground">
            This is the reference: every episode equals itself.
          </p>
        ) : counts ? (
          <CountsBar counts={counts} />
        ) : (
          <p className="text-sm text-muted-foreground">
            No paired runs for these settings.
          </p>
        )}
      </div>
    </>
  )
}

/**
 * Water for the field footprint: unmet crop water in the analog episodes and how each
 * strategy compares over all episodes. The starting point and the sowing date are
 * controls that change which released runs are shown. Nothing is recomputed here.
 */
export function WaterRow({
  compare,
  water,
  campaigns,
}: {
  compare: Compare
  water: WaterBlock
  campaigns: ReadonlyArray<CampaignPoint>
}) {
  const [depthM, setDepthM] = useState(water.default_depth_m)
  const [initialWaterFraction, setInitialWaterFraction] = useState(
    water.default_initial_water_fraction
  )
  const [summerShiftDays, setSummerShiftDays] = useState(0)
  const settings: WaterSettings = {
    depthM,
    initialWaterFraction,
    summerShiftDays,
  }

  const fractions = [
    ...new Set(water.episodes.map((episode) => episode.initial_water_fraction)),
  ].sort((a, b) => a - b)
  const shifts = [...water.summer_shift_days].sort((a, b) => a - b)
  const hasRuns = (candidate: WaterSettings) =>
    water.episodes.some((episode) => matchesSettings(episode, candidate))

  const analogRankByScenario = new Map(
    campaigns.map((campaign) => [campaign.scenario_id, campaign.analog_rank])
  )
  const domain = stripDomain([
    0,
    ...water.episodes
      .filter(
        (episode) =>
          episode.scenario_id !== null && matchesSettings(episode, settings)
      )
      .map((episode) => episode.crop_demand_unmet_fraction),
  ])

  const depths = [
    ...new Map(
      water.starting_points.map((point) => [point.depth_m, point.capacity_mm])
    ),
  ].sort(([a], [b]) => a - b)
  const startYears = water.episodes.map((episode) => episode.start_year)
  const firstStartYear = Math.min(...startYears)
  const lastStartYear = Math.max(...startYears)
  const analogCount = campaigns.filter((campaign) => campaign.is_analog).length
  const analogWithRuns = new Set(
    water.episodes.flatMap((episode) =>
      episode.scenario_id === null ? [] : [episode.scenario_id]
    )
  ).size

  return (
    <ComparisonRow
      title="Water: unmet crop water on the field footprint"
      description={`Released daily water-balance runs on the reference footprint, for start years ${firstStartYear} to ${lastStartYear}. ${analogWithRuns} of the ${analogCount} analog campaigns have a run. Pick the starting point and the sowing date; the strips and counts show the runs for that choice.`}
      evidence={
        <EvidenceChip
          meta={water.meta}
          scaleLabel={`Footprint ${water.field_id}`}
          horizon={WATER_HORIZON}
        />
      }
      controls={
        <div className="grid gap-4 rounded-lg border bg-secondary p-3 sm:grid-cols-2 lg:grid-cols-[auto_auto_1fr]">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium">
              Starting point: soil depth
            </span>
            <SegmentedControl
              label="Soil depth and water capacity"
              value={String(depthM)}
              options={depths.map(([depth, capacity]) => ({
                value: String(depth),
                label: `${depth} m · ${Math.round(capacity)} mm`,
              }))}
              onChange={(next) => {
                const depth = Number(next)
                setDepthM(depth)
                if (!hasRuns({ ...settings, depthM: depth }))
                  setSummerShiftDays(0)
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium">
              Starting point: initial water
            </span>
            <SegmentedControl
              label="Initial soil water"
              value={String(initialWaterFraction)}
              options={fractions.map((fraction) => ({
                value: String(fraction),
                label: formatShare(fraction),
              }))}
              onChange={(next) => {
                const fraction = Number(next)
                setInitialWaterFraction(fraction)
                if (!hasRuns({ ...settings, initialWaterFraction: fraction })) {
                  setSummerShiftDays(0)
                }
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium">
              Sowing date: summer crops shifted by
            </span>
            <SegmentedControl
              label="Summer sowing shift"
              value={String(summerShiftDays)}
              options={shifts.map((days) => ({
                value: String(days),
                label: shiftLabel(days),
                disabled: !hasRuns({ ...settings, summerShiftDays: days }),
              }))}
              onChange={(next) => setSummerShiftDays(Number(next))}
            />
          </div>
        </div>
      }
    >
      <StrategyGrid>
        {compare.strategies.map((strategy) => (
          <StrategyCell key={strategy.strategy_id} strategy={strategy}>
            <WaterCell
              strategy={strategy}
              water={water}
              settings={settings}
              analogRankByScenario={analogRankByScenario}
              domain={domain}
            />
          </StrategyCell>
        ))}
      </StrategyGrid>
      {water.limitations.length > 0 && (
        <details className="text-sm">
          <summary className="w-fit cursor-pointer rounded-lg text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
            Limits of the water runs
          </summary>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
            {water.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </details>
      )}
    </ComparisonRow>
  )
}
