import {
  type CampaignPoint,
  type CaseBundle,
  changeWaterStartingPoint,
  defaultWaterSettings,
  findWaterEpisode,
  hasWaterRuns,
  matchesWaterSettings,
  type SourceRef,
  type Strategy,
  type WaterBlock,
  type WaterEpisode,
  type WaterSettings,
  waterAnalogCampaigns,
} from "@cropilot/api"
import { useRouter } from "expo-router"
import { useState } from "react"
import { Pressable, ScrollView, View } from "react-native"
import { ListRow, ListSection } from "@/components/list-row"
import { Sheet } from "@/components/ui/sheet"
import { Text } from "@/components/ui/text"
import { NotAvailable, NotComputedRow } from "@/features/case/block-section"
import { DotStrip, stripDomain } from "@/features/case/blocks/compare/dot-strip"
import {
  campaignName,
  formatDate,
  formatMm,
  formatShare,
  formatSigned,
} from "@/features/case/case-format"
import { EvidenceDetails } from "@/features/case/evidence-chip"
import { waterStrategyHref } from "@/features/case/routes"
import { cn } from "@/lib/utils"

const WATER_HORIZON = "Three continuous campaigns from June of the start year"
const DATE_RESET_NOTICE =
  "Sowing date changed to Default date because no shifted run exists for this starting point."

function shiftLabel(days: number): string {
  return days === 0
    ? "Default date"
    : `${days > 0 ? "+" : "-"}${Math.abs(days)} days`
}

function depthOptions(water: WaterBlock): Array<[number, number]> {
  return [
    ...new Map(water.starting_points.map((p) => [p.depth_m, p.capacity_mm])),
  ].sort(([a], [b]) => a - b)
}

/** One line for the starting point and sowing date, as the settings row shows it. */
export function waterSettingsSummary(
  water: WaterBlock,
  settings: WaterSettings
): string {
  const capacity = depthOptions(water).find(
    ([depth]) => depth === settings.depth_m
  )?.[1]
  return [
    `${settings.depth_m} m${capacity === undefined ? "" : ` · ${Math.round(capacity)} mm`}`,
    `${formatShare(settings.initial_water_fraction)} initial water`,
    shiftLabel(settings.summer_shift_days),
  ].join(" · ")
}

function Choices<T extends number | string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: ReadonlyArray<{ value: T; label: string; disabled?: boolean }>
  onChange: (value: T) => void
}) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => (
          <Pressable
            key={String(option.value)}
            accessibilityRole="button"
            accessibilityState={{
              selected: value === option.value,
              disabled: option.disabled,
            }}
            disabled={option.disabled}
            onPress={() => onChange(option.value)}
            className={cn(
              "min-h-11 justify-center rounded-lg border px-3",
              value === option.value
                ? "border-primary bg-primary/10"
                : "border-border",
              option.disabled && "opacity-40"
            )}
          >
            <Text className="text-sm">{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

/** The long explanation of the water runs, for the header's information sheet. */
export function WaterInfo({
  water,
  sources,
}: {
  water: WaterBlock
  sources: ReadonlyArray<SourceRef>
}) {
  return (
    <View className="gap-4">
      <Text>{WATER_HORIZON}.</Text>
      <EvidenceDetails
        meta={water.meta}
        scaleLabel={`Footprint ${water.field_id}`}
        horizon={WATER_HORIZON}
        sources={sources}
      />
      <Text>
        Selected campaign details replay three continuous campaigns. The strips
        show all available analogs; the counts use all released episodes.
        Historical scenarios, not forecasts or agronomic recommendations.
      </Text>
      <Text className="font-medium">Limits of the water runs</Text>
      {water.limitations.map((item) => (
        <Text key={item} className="text-sm text-muted-foreground">
          {item}
        </Text>
      ))}
    </View>
  )
}

export function WaterDetail({
  bundle,
  zoneId,
}: {
  bundle: CaseBundle
  zoneId: string
}) {
  const water = bundle.compare.water
  return water && bundle.modules.water === "available" ? (
    <AvailableWaterDetail
      key={bundle.zone_id}
      bundle={bundle}
      water={water}
      zoneId={zoneId}
    />
  ) : (
    <View className="px-4 py-4">
      <NotAvailable description="The water runs exist for the Pergamino reference footprint only." />
    </View>
  )
}

function AvailableWaterDetail({
  bundle,
  water,
  zoneId,
}: {
  bundle: CaseBundle
  water: WaterBlock
  zoneId: string
}) {
  const router = useRouter()
  const [settings, setSettings] = useState(() => defaultWaterSettings(water))
  const [dateNotice, setDateNotice] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const analogCampaigns = waterAnalogCampaigns(bundle.years_like_this.campaigns)
  const [scenarioId, setScenarioId] = useState(
    analogCampaigns[0]?.scenario_id ?? null
  )
  const selectedCampaign = analogCampaigns.find(
    (campaign) => campaign.scenario_id === scenarioId
  )
  const changeStartingPoint = (
    change: Partial<Pick<WaterSettings, "depth_m" | "initial_water_fraction">>
  ) => {
    const next = changeWaterStartingPoint(water, settings, change)
    setDateNotice(
      next.summer_shift_days !== settings.summer_shift_days
        ? DATE_RESET_NOTICE
        : null
    )
    setSettings(next)
  }
  const notice = dateNotice && (
    <Text accessibilityRole="alert" className="text-sm text-muted-foreground">
      {dateNotice}
    </Text>
  )

  return (
    <View className="gap-4 py-4">
      <View className="gap-2">
        <Text className="px-4 text-sm font-medium">
          Historical start campaign
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="shrink-0 grow-0"
          contentContainerClassName="gap-2 px-4"
        >
          {analogCampaigns.map((campaign) => {
            const hasRun = hasWaterRuns(water, settings, campaign.scenario_id)
            const selected = campaign.scenario_id === scenarioId
            return (
              <Pressable
                key={campaign.scenario_id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setScenarioId(campaign.scenario_id)}
                className={cn(
                  "min-h-11 justify-center rounded-lg border px-3",
                  selected ? "border-primary bg-primary/10" : "border-border"
                )}
              >
                <Text
                  className={cn("text-sm", !hasRun && "text-muted-foreground")}
                >
                  {`${campaign.campaign}${hasRun ? "" : " · no run"}`}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>
      <View className="gap-2 px-4">
        <ListRow
          title="Starting point and sowing date"
          subtitle={waterSettingsSummary(water, settings)}
          onPress={() => setSettingsOpen(true)}
        />
        {notice}
      </View>
      <View className="px-4">
        <ListSection
          title={
            selectedCampaign
              ? `Three campaigns from June ${selectedCampaign.start_year}`
              : "Unmet crop water"
          }
        >
          {bundle.compare.strategies.map((strategy) => (
            <WaterStrategyRow
              key={strategy.strategy_id}
              strategy={strategy}
              episode={findWaterEpisode(
                water,
                strategy.strategy_id,
                scenarioId,
                settings
              )}
              onPress={
                strategy.water_strategy_id === null
                  ? undefined
                  : () =>
                      router.push(
                        waterStrategyHref(
                          zoneId,
                          strategy.strategy_id,
                          settings,
                          scenarioId
                        )
                      )
              }
            />
          ))}
        </ListSection>
      </View>
      <Sheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Starting point and sowing date"
      >
        <Choices
          label="Starting point: soil depth"
          value={settings.depth_m}
          options={depthOptions(water).map(([value, capacity]) => ({
            value,
            label: `${value} m · ${Math.round(capacity)} mm`,
          }))}
          onChange={(value) => changeStartingPoint({ depth_m: value })}
        />
        <Choices
          label="Starting point: initial water"
          value={settings.initial_water_fraction}
          options={[
            ...new Set(
              water.starting_points.map((p) => p.initial_water_fraction)
            ),
          ]
            .sort((a, b) => a - b)
            .map((value) => ({ value, label: formatShare(value) }))}
          onChange={(value) =>
            changeStartingPoint({ initial_water_fraction: value })
          }
        />
        <Choices
          label="Sowing date: summer crops shifted by"
          value={settings.summer_shift_days}
          options={[...water.summer_shift_days]
            .sort((a, b) => a - b)
            .map((value) => ({
              value,
              label: shiftLabel(value),
              disabled: !hasWaterRuns(water, {
                ...settings,
                summer_shift_days: value,
              }),
            }))}
          onChange={(value) => {
            setSettings({ ...settings, summer_shift_days: value })
            setDateNotice(null)
          }}
        />
        {notice}
      </Sheet>
    </View>
  )
}

function WaterStrategyRow({
  strategy,
  episode,
  onPress,
}: {
  strategy: Strategy
  episode: WaterEpisode | undefined
  onPress?: () => void
}) {
  const subtitle =
    strategy.water_strategy_id === null
      ? "Not computed · Cropilot has no water simulation for this rotation."
      : episode
        ? `${formatShare(episode.crop_demand_unmet_fraction)} of crop water unmet · ${formatMm(episode.crop_et_deficit_mm)}`
        : "No released water run for the selected campaign and settings."
  return (
    <ListRow
      title={strategy.label}
      subtitle={subtitle}
      accessibilityLabel={`${strategy.label}. ${subtitle}`}
      onPress={onPress}
    />
  )
}

function EpisodeDetail({ episode }: { episode: WaterEpisode }) {
  return (
    <View className="gap-4">
      <View className="gap-1">
        <Text className="text-sm text-muted-foreground">
          Three campaigns from June {episode.start_year}
        </Text>
        <Text className="text-4xl font-light tracking-tight">
          {formatShare(episode.crop_demand_unmet_fraction)}
        </Text>
        <Text>
          of crop water unmet · {formatMm(episode.crop_et_deficit_mm)}
        </Text>
        <Text className="text-xs text-muted-foreground">
          Modeled crop demand: {formatMm(episode.crop_et_potential_mm)}. Water
          at episode end: {formatMm(episode.water_end_mm)}.
        </Text>
      </View>
      <ListSection title="Crops and sowing dates">
        {episode.crops.map((crop) => (
          <View
            key={`${crop.crop}-${crop.sowing_date}`}
            className="gap-1 border-b border-border py-3"
          >
            <Text>
              {crop.crop} · {campaignName(crop.campaign_year)}
            </Text>
            <Text className="text-sm text-muted-foreground">
              Sown {formatDate(crop.sowing_date)}
            </Text>
            <Text className="text-sm text-muted-foreground">
              Water at sowing: {formatMm(crop.water_at_sowing_mm)} · unmet crop
              water: {formatMm(crop.crop_et_deficit_mm)}
            </Text>
            <Text className="text-sm text-muted-foreground">
              Mid-season stress: {crop.mid_season_stress_days} days · with
              maximum temperature above 35°C: {crop.coincident_stress_heat_days}{" "}
              days
            </Text>
          </View>
        ))}
      </ListSection>
      <Text className="text-xs text-muted-foreground">
        Generic crop stages and the 35°C heat screen are research assumptions,
        not observed flowering or validated crop damage.
      </Text>
      <Text className="text-xs text-muted-foreground">
        Released run: {episode.run_id}
      </Text>
    </View>
  )
}

/** One rotation's water result for the chosen campaign and settings, on its own screen. */
export function WaterStrategyDetail({
  water,
  strategy,
  campaigns,
  settings,
  scenarioId,
}: {
  water: WaterBlock
  strategy: Strategy
  campaigns: ReadonlyArray<CampaignPoint>
  settings: WaterSettings
  scenarioId: string | null
}) {
  const campaign = waterAnalogCampaigns(campaigns).find(
    (item) => item.scenario_id === scenarioId
  )
  const isShifted = settings.summer_shift_days !== 0
  const episodes = water.episodes.filter(
    (e) =>
      e.strategy_id === strategy.strategy_id &&
      e.scenario_id !== null &&
      matchesWaterSettings(e, settings)
  )
  const domain = stripDomain([
    0,
    ...water.episodes
      .filter(
        (e) => e.scenario_id !== null && matchesWaterSettings(e, settings)
      )
      .map((e) => e.crop_demand_unmet_fraction),
  ])
  const counts = (isShifted ? water.calendar_effects : water.robustness).find(
    (entry) =>
      entry.strategy_id === strategy.strategy_id &&
      matchesWaterSettings(entry, settings)
  )
  const selectedEpisode = findWaterEpisode(
    water,
    strategy.strategy_id,
    scenarioId,
    settings
  )
  if (strategy.water_strategy_id === null)
    return (
      <NotComputedRow
        title="Water"
        reason="Cropilot has no water simulation for this rotation."
      />
    )
  return (
    <View className="gap-6">
      <View className="gap-1">
        <Text className="text-sm">
          {campaign?.campaign ?? "No campaign selected"}
        </Text>
        <Text className="text-sm text-muted-foreground">
          {waterSettingsSummary(water, settings)}
        </Text>
        {strategy.water_match === "closest" && (
          <Text className="text-sm text-muted-foreground">
            Closest match: same crops, a different phase of the cycle.
          </Text>
        )}
      </View>
      {selectedEpisode ? (
        <EpisodeDetail episode={selectedEpisode} />
      ) : (
        <Text className="text-muted-foreground">
          No released water run for the selected campaign and settings.
        </Text>
      )}
      <View className="gap-2">
        <Text className="font-medium">Unmet crop water, analog episodes</Text>
        {episodes.length ? (
          <DotStrip
            domain={domain}
            format={formatShare}
            dots={episodes.map((e) => ({
              key: e.run_id,
              value: e.crop_demand_unmet_fraction,
              description: `${campaignName(e.start_year)}: ${formatShare(e.crop_demand_unmet_fraction)} of crop water unmet, ${formatMm(e.crop_et_deficit_mm)}`,
            }))}
          />
        ) : (
          <Text className="text-sm text-muted-foreground">
            No run for these settings.
          </Text>
        )}
      </View>
      <View className="gap-2">
        <Text className="font-medium">
          {isShifted
            ? "Against the default sowing date, all episodes"
            : "Against the current rotation, all episodes"}
        </Text>
        {strategy.is_current && !isShifted ? (
          <Text className="text-sm text-muted-foreground">
            This is the reference: every episode equals itself.
          </Text>
        ) : counts ? (
          <>
            <View className="h-2 flex-row overflow-hidden rounded-lg bg-muted">
              <View
                className="bg-primary"
                style={{ flex: counts.lower_count }}
              />
              <View
                className="bg-muted-foreground"
                style={{ flex: counts.equal_count }}
              />
              <View
                className="bg-border"
                style={{ flex: counts.higher_count }}
              />
            </View>
            <Text className="text-sm">
              Less unmet water in {counts.lower_count} · same in{" "}
              {counts.equal_count} · more in {counts.higher_count} of{" "}
              {counts.count} episodes
            </Text>
            <Text className="text-xs text-muted-foreground">
              Difference in unmet crop water: median{" "}
              {formatSigned(counts.median_mm, 0)} mm, from{" "}
              {formatSigned(counts.minimum_mm, 0)} to{" "}
              {formatSigned(counts.maximum_mm, 0)} mm.
            </Text>
          </>
        ) : (
          <Text className="text-sm text-muted-foreground">
            No paired runs for these settings.
          </Text>
        )}
      </View>
    </View>
  )
}
