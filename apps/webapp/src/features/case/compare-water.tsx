import {
  type CampaignPoint,
  type Compare,
  changeWaterStartingPoint,
  defaultWaterSettings,
  findWaterEpisode,
  hasWaterRuns,
  matchesWaterSettings,
  type PairedCounts,
  type Strategy,
  type WaterBlock,
  type WaterEpisode,
  type WaterSettings,
  waterAnalogCampaigns,
} from "@cropilot/api"
import { useState } from "react"
import { SegmentedControl } from "@/components/segmented-control"
import { NotComputedRow } from "@/features/case/block-frame"
import {
  campaignName,
  formatDate,
  formatDecimal,
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
import { translate, useI18n } from "@/lib/i18n"

const WATER_HORIZON = "Three continuous campaigns from June of the start year"

function shiftLabel(days: number): string {
  return days === 0
    ? translate("Default date")
    : translate("{days} days", undefined, {
        days: `${days > 0 ? "+" : "-"}${Math.abs(days)}`,
      })
}

/** Lower, equal and higher, as one bar and a sentence. Ink for higher, accent for lower. */
function CountsBar({ counts }: { counts: PairedCounts }) {
  const { t } = useI18n("case")

  const parts = [
    {
      key: "lower",
      label: "Less unmet water in",
      count: counts.lower_count,
      className: "bg-primary",
    },
    {
      key: "equal",
      label: "same in",
      count: counts.equal_count,
      className: "bg-border",
    },
    {
      key: "higher",
      label: "more in",
      count: counts.higher_count,
      className: "bg-foreground",
    },
  ] as const
  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="img"
        aria-label={parts
          .map((part) => `${t(part.label)} ${part.count}`)
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
        {parts.map((part) => `${t(part.label)} ${part.count}`).join(" · ")}
        <span className="text-muted-foreground">
          {t(" of {value1} episodes", { value1: counts.count })}
        </span>
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {t(
          "Difference in unmet crop water: median {value1} mm, from {value2} to {value3} mm.",
          {
            value1: formatSigned(counts.median_mm, 0),
            value2: formatSigned(counts.minimum_mm, 0),
            value3: formatSigned(counts.maximum_mm, 0),
          }
        )}
      </p>
    </div>
  )
}

function EpisodeDetail({ episode }: { episode: WaterEpisode }) {
  const { t } = useI18n("case")

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <p className="text-sm font-medium">
        {t("Three campaigns from June {value1}", {
          value1: episode.start_year,
        })}
      </p>
      <p className="text-sm tabular-nums">
        {t("{value1} of crop water unmet · {value2}", {
          value1: formatShare(episode.crop_demand_unmet_fraction),
          value2: formatMm(episode.crop_et_deficit_mm),
        })}
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {t("Modeled crop demand: {value1}. Water at episode end: {value2}.", {
          value1: formatMm(episode.crop_et_potential_mm),
          value2: formatMm(episode.water_end_mm),
        })}
      </p>
      <details>
        <summary className="w-fit cursor-pointer rounded-lg text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
          {t("Crops and sowing dates")}
        </summary>
        <div className="mt-2 flex flex-col gap-3">
          {episode.crops.map((crop) => (
            <div
              key={`${crop.crop}-${crop.sowing_date}`}
              className="flex flex-col gap-1 border-t pt-2 text-xs"
            >
              <p className="font-medium">
                {t(crop.crop)} · {campaignName(crop.campaign_year)}
              </p>
              <p>
                {t("Sown {value1}", { value1: formatDate(crop.sowing_date) })}
              </p>
              <p>
                {t("Water at sowing: {value1} · unmet crop water: {value2}", {
                  value1: formatMm(crop.water_at_sowing_mm),
                  value2: formatMm(crop.crop_et_deficit_mm),
                })}
              </p>
              <p>
                {t(
                  "Mid-season stress: {value1} days · with maximum temperature above 35°C: {value2} days",
                  {
                    value1: crop.mid_season_stress_days,
                    value2: crop.coincident_stress_heat_days,
                  }
                )}
              </p>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            {t(
              "Generic crop stages and the 35°C heat screen are research assumptions, not observed flowering or validated crop damage."
            )}
          </p>
          <p className="break-all text-xs text-muted-foreground">
            {t("Released run: {value1}", { value1: episode.run_id })}
          </p>
        </div>
      </details>
    </div>
  )
}

function WaterCell({
  strategy,
  water,
  settings,
  analogRankByScenario,
  domain,
  scenarioId,
}: {
  strategy: Strategy
  water: WaterBlock
  settings: WaterSettings
  analogRankByScenario: ReadonlyMap<string, number | null>
  domain: [number, number] | null
  scenarioId: string | null
}) {
  const { t } = useI18n("case")

  if (strategy.water_strategy_id === null) {
    return (
      <NotComputedRow
        title={t("Water")}
        reason={t("Cropilot has no water simulation for this rotation.")}
      />
    )
  }

  const analogs = water.episodes
    .filter(
      (episode) =>
        episode.strategy_id === strategy.strategy_id &&
        episode.scenario_id !== null &&
        matchesWaterSettings(episode, settings)
    )
    .sort((a, b) => a.start_year - b.start_year)
  const dots: StripDot[] = analogs.map((episode) => {
    const rank = analogRankByScenario.get(episode.scenario_id ?? "")
    return {
      key: episode.run_id,
      value: episode.crop_demand_unmet_fraction,
      description: t(
        "{campaign}{analog}: {share} of crop water unmet, {deficit}",
        {
          campaign: campaignName(episode.start_year),
          analog: rank ? t(" (analog {rank})", { rank }) : "",
          share: formatShare(episode.crop_demand_unmet_fraction),
          deficit: formatMm(episode.crop_et_deficit_mm),
        }
      ),
    }
  })

  const selectedEpisode = findWaterEpisode(
    water,
    strategy.strategy_id,
    scenarioId,
    settings
  )
  const isShifted = settings.summer_shift_days !== 0
  const counts = (isShifted ? water.calendar_effects : water.robustness).find(
    (entry) =>
      entry.strategy_id === strategy.strategy_id &&
      matchesWaterSettings(entry, settings)
  )

  return (
    <>
      {strategy.water_match === "closest" && (
        <p className="rounded-lg bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
          {t("Closest match: same crops, a different phase of the cycle.")}
        </p>
      )}
      {selectedEpisode ? (
        <EpisodeDetail episode={selectedEpisode} />
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("No released water run for the selected campaign and settings.")}
        </p>
      )}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium">
          {t("Unmet ")}
          <Term term="Crop water deficit">{t("crop water")}</Term>
          {t(", analog episodes")}
        </span>
        {dots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("No run for these settings.")}
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
            ? t("Against the default sowing date, all episodes")
            : t("Against the current rotation, all episodes")}
        </span>
        {strategy.is_current && !isShifted ? (
          <p className="text-sm text-muted-foreground">
            {t("This is the reference: every episode equals itself.")}
          </p>
        ) : counts ? (
          <CountsBar counts={counts} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("No paired runs for these settings.")}
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
  const { t } = useI18n("case")

  const [settings, setSettings] = useState(() => defaultWaterSettings(water))
  const [dateNotice, setDateNotice] = useState<string | null>(null)
  const analogCampaigns = waterAnalogCampaigns(campaigns)
  const [scenarioId, setScenarioId] = useState(
    analogCampaigns[0]?.scenario_id ?? null
  )
  const changeStartingPoint = (
    change: Partial<Pick<WaterSettings, "depth_m" | "initial_water_fraction">>
  ) => {
    const next = changeWaterStartingPoint(water, settings, change)
    setDateNotice(
      next.summer_shift_days !== settings.summer_shift_days
        ? "Sowing date changed to Default date because no shifted run exists for this starting point."
        : null
    )
    setSettings(next)
  }

  const fractions = [
    ...new Set(water.episodes.map((episode) => episode.initial_water_fraction)),
  ].sort((a, b) => a - b)
  const shifts = [...water.summer_shift_days].sort((a, b) => a - b)
  const analogRankByScenario = new Map(
    campaigns.map((campaign) => [campaign.scenario_id, campaign.analog_rank])
  )
  const domain = stripDomain([
    0,
    ...water.episodes
      .filter(
        (episode) =>
          episode.scenario_id !== null &&
          matchesWaterSettings(episode, settings)
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
      title={t("Water: unmet crop water on the field footprint")}
      description={t(
        "Released daily water-balance runs on the reference footprint, for start years {value1} to {value2}. {value3} of the {value4} analog campaigns have a run. Pick the starting point and the sowing date; the strips and counts show the runs for that choice.",
        {
          value1: firstStartYear,
          value2: lastStartYear,
          value3: analogWithRuns,
          value4: analogCount,
        }
      )}
      evidence={
        <EvidenceChip
          meta={water.meta}
          scaleLabel={t("Footprint {value1}", { value1: water.field_id })}
          horizon={WATER_HORIZON}
        />
      }
      controls={
        <div className="grid gap-4 rounded-lg border bg-secondary p-3 sm:grid-cols-2 lg:grid-cols-[auto_auto_1fr]">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium">
              {t("Starting point: soil depth")}
            </span>
            <SegmentedControl
              label={t("Soil depth and water capacity")}
              value={String(settings.depth_m)}
              options={depths.map(([depth, capacity]) => ({
                value: String(depth),
                label: `${formatDecimal(depth, String(depth).includes(".") ? 1 : 0)} m · ${formatMm(capacity)}`,
              }))}
              onChange={(next) => {
                changeStartingPoint({ depth_m: Number(next) })
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium">
              {t("Starting point: initial water")}
            </span>
            <SegmentedControl
              label={t("Initial soil water")}
              value={String(settings.initial_water_fraction)}
              options={fractions.map((fraction) => ({
                value: String(fraction),
                label: formatShare(fraction),
              }))}
              onChange={(next) => {
                changeStartingPoint({ initial_water_fraction: Number(next) })
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium">
              {t("Sowing date: summer crops shifted by")}
            </span>
            <SegmentedControl
              label={t("Summer sowing shift")}
              value={String(settings.summer_shift_days)}
              options={shifts.map((days) => ({
                value: String(days),
                label: shiftLabel(days),
                disabled: !hasWaterRuns(water, {
                  ...settings,
                  summer_shift_days: days,
                }),
              }))}
              onChange={(next) => {
                setSettings({ ...settings, summer_shift_days: Number(next) })
                setDateNotice(null)
              }}
            />
          </div>
          {dateNotice && (
            <p
              role="status"
              className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-3"
            >
              {t(dateNotice)}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3">
            <span className="text-xs font-medium">
              {t("Historical start campaign")}
            </span>
            <SegmentedControl
              label={t("Historical start campaign")}
              value={scenarioId ?? ""}
              options={analogCampaigns.map((campaign) => ({
                value: campaign.scenario_id,
                label: `${campaign.campaign}${hasWaterRuns(water, settings, campaign.scenario_id) ? "" : t(" · no run")}`,
              }))}
              onChange={setScenarioId}
            />
            <p className="text-xs text-muted-foreground">
              {t(
                "Selected campaign details replay three continuous campaigns. The strips show all available analogs; the counts use all released episodes. Historical scenarios, not forecasts or agronomic recommendations."
              )}
            </p>
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
              scenarioId={scenarioId}
            />
          </StrategyCell>
        ))}
      </StrategyGrid>
      {water.limitations.length > 0 && (
        <details className="text-sm">
          <summary className="w-fit cursor-pointer rounded-lg text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
            {t("Limits of the water runs")}
          </summary>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
            {water.limitations.map((limitation) => (
              <li key={limitation}>{t(limitation)}</li>
            ))}
          </ul>
        </details>
      )}
    </ComparisonRow>
  )
}
