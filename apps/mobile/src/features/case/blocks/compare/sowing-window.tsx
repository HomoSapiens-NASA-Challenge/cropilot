import type { CaseBundle, WaterBlock, WaterCrop } from "@cropilot/api"
import { View } from "react-native"
import { ListRow, ListSection } from "@/components/list-row"
import { Text } from "@/components/ui/text"
import { formatMm } from "@/features/case/case-format"
import { EvidenceChip, EvidenceDetails } from "@/features/case/evidence-chip"
import { InfoButton } from "@/features/case/info-button"
import { cn } from "@/lib/utils"

export type SowingWindowShift = {
  readonly days: number
  readonly shiftTitle: string
  readonly dateLabel: string
  readonly medianStressDays: number
  readonly fewestCount: number
  readonly medianDeficitMm: number
  readonly isBest: boolean
}

export type SowingWindowCampaign = {
  readonly scenarioId: string
  readonly campaign: string
  readonly defaultStressDays: number
  readonly minStressDays: number
  readonly bestShifts: readonly number[]
  readonly bestShiftsLabel: string
}

export type SowingWindowData = {
  readonly crop: string
  readonly strategyIds: readonly string[]
  readonly strategyLabels: readonly string[]
  readonly sharingLine: string
  readonly headline: string
  readonly shifts: readonly SowingWindowShift[]
  readonly campaigns: readonly SowingWindowCampaign[]
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) {
    return sorted[mid] ?? 0
  }
  const low = sorted[mid - 1] ?? 0
  const high = sorted[mid] ?? 0
  return (low + high) / 2
}

const SHORT_DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
})

function typicalDate(isoDates: readonly string[]): string {
  if (isoDates.length === 0) return ""
  const doys = isoDates.map((iso) => {
    const d = new Date(`${iso}T00:00:00Z`)
    const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return (
      Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    )
  })
  const medianDoy = Math.round(median(doys))
  const refDate = new Date(Date.UTC(2026, 0, medianDoy))
  return SHORT_DATE.format(refDate)
}

function formatList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? ""
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
}

function shiftHeading(days: number): string {
  if (days === 0) return "On the default date"
  if (days < 0) return `${Math.abs(days)} days earlier`
  return `${days} days later`
}

function shiftPhrase(days: number): string {
  if (days === 0) return "the default date"
  if (days < 0) return `${Math.abs(days)} days earlier`
  return `${days} days later`
}

export function computeSowingWindows(
  bundle: CaseBundle,
  water: WaterBlock
): readonly SowingWindowData[] {
  const matchingEpisodes = water.episodes.filter(
    (e) =>
      Boolean(e.scenario_id?.startsWith("analog:")) &&
      e.depth_m === water.default_depth_m &&
      e.initial_water_fraction === water.default_initial_water_fraction
  )
  if (matchingEpisodes.length === 0) return []

  const strategyOrder = bundle.compare.strategies.map((s) => s.strategy_id)
  const strategyIds = [
    ...new Set(matchingEpisodes.map((e) => e.strategy_id)),
  ].sort((a, b) => strategyOrder.indexOf(a) - strategyOrder.indexOf(b))

  const shifts = [...water.summer_shift_days].sort((a, b) => a - b)
  const analogScenarios = [
    ...new Set(matchingEpisodes.map((e) => e.scenario_id)),
  ]
    .filter((id): id is string => id !== null)
    .sort()

  type GroupAccumulator = {
    cropName: string
    fingerprint: string
    strategyIds: string[]
  }
  const groups: GroupAccumulator[] = []

  for (const stratId of strategyIds) {
    const stratEpisodes = matchingEpisodes.filter(
      (e) => e.strategy_id === stratId
    )
    const sampleCrop = stratEpisodes[0]?.crops.find(
      (c: WaterCrop) => c.crop !== "Wheat"
    )
    const cropName = sampleCrop ? sampleCrop.crop : "Summer crop"

    const fingerprint = analogScenarios
      .map((scen) =>
        shifts
          .map((shift) => {
            const ep = stratEpisodes.find(
              (e) => e.scenario_id === scen && e.summer_shift_days === shift
            )
            const c = ep?.crops.find((cr: WaterCrop) => cr.crop !== "Wheat")
            return c?.mid_season_stress_days ?? -1
          })
          .join(",")
      )
      .join(";")

    const existing = groups.find(
      (g) => g.cropName === cropName && g.fingerprint === fingerprint
    )
    if (existing) {
      existing.strategyIds.push(stratId)
    } else {
      groups.push({ cropName, fingerprint, strategyIds: [stratId] })
    }
  }

  const results: SowingWindowData[] = []

  for (const group of groups) {
    const stratId = group.strategyIds[0]
    if (!stratId) continue

    const stratEpisodes = matchingEpisodes.filter(
      (e) => e.strategy_id === stratId
    )

    const campaignFewestPerShift = new Map<number, number>()
    for (const s of shifts) {
      campaignFewestPerShift.set(s, 0)
    }

    const campaigns: SowingWindowCampaign[] = []
    for (const scen of analogScenarios) {
      const campEpisodes = stratEpisodes.filter((e) => e.scenario_id === scen)
      const stressByShift = new Map<number, number>()

      for (const shift of shifts) {
        const ep = campEpisodes.find((e) => e.summer_shift_days === shift)
        const c = ep?.crops.find((cr: WaterCrop) => cr.crop !== "Wheat")
        stressByShift.set(shift, c?.mid_season_stress_days ?? 0)
      }

      const stressValues = Array.from(stressByShift.values())
      const minStress = Math.min(...stressValues)
      const bestShifts = shifts.filter(
        (shift) => stressByShift.get(shift) === minStress
      )

      for (const bs of bestShifts) {
        const currentCount = campaignFewestPerShift.get(bs) ?? 0
        campaignFewestPerShift.set(bs, currentCount + 1)
      }

      const bestShiftsLabel = bestShifts.map(shiftPhrase).join(", ")
      const defaultStressDays = stressByShift.get(0) ?? 0

      campaigns.push({
        scenarioId: scen,
        campaign: scen.replace(/^analog:/, ""),
        defaultStressDays,
        minStressDays: minStress,
        bestShifts,
        bestShiftsLabel,
      })
    }

    const shiftStressMap = new Map<number, number[]>()
    const shiftDeficitMap = new Map<number, number[]>()
    const shiftDatesMap = new Map<number, string[]>()
    for (const s of shifts) {
      shiftStressMap.set(s, [])
      shiftDeficitMap.set(s, [])
      shiftDatesMap.set(s, [])
    }

    for (const ep of stratEpisodes) {
      const c = ep.crops.find((cr: WaterCrop) => cr.crop !== "Wheat")
      if (c) {
        shiftStressMap.get(ep.summer_shift_days)?.push(c.mid_season_stress_days)
        shiftDeficitMap.get(ep.summer_shift_days)?.push(c.crop_et_deficit_mm)
        shiftDatesMap.get(ep.summer_shift_days)?.push(c.sowing_date)
      }
    }

    const unrankedShifts = shifts.map((days) => {
      const stressList = shiftStressMap.get(days) ?? []
      const deficitList = shiftDeficitMap.get(days) ?? []
      const datesList = shiftDatesMap.get(days) ?? []
      return {
        days,
        shiftTitle: shiftHeading(days),
        dateLabel: typicalDate(datesList),
        medianStressDays: Math.round(median(stressList)),
        fewestCount: campaignFewestPerShift.get(days) ?? 0,
        medianDeficitMm: median(deficitList),
      }
    })

    const minMedianStress = Math.min(
      ...unrankedShifts.map((s) => s.medianStressDays)
    )
    const shiftResults: SowingWindowShift[] = unrankedShifts.map((s) => ({
      ...s,
      isBest: s.medianStressDays === minMedianStress,
    }))

    const strategyLabels = group.strategyIds.map((id) => {
      const strat = bundle.compare.strategies.find((s) => s.strategy_id === id)
      return strat?.label ?? id
    })

    const cropLower = group.cropName.toLowerCase()
    const sharingLine =
      strategyLabels.length > 1
        ? `In a season like this, ${formatList(strategyLabels)} all start with ${cropLower}, so they share this window.`
        : `In a season like this, ${strategyLabels[0]} starts with ${cropLower}.`

    const lowestShifts = shiftResults
      .filter((s) => s.medianStressDays === minMedianStress)
      .map((s) => s.days)
    const defaultShift = shiftResults.find((s) => s.days === 0)
    const defaultMedian = defaultShift?.medianStressDays ?? 0

    let sentence1 = ""
    if (lowestShifts.length === 1 && lowestShifts[0] === 0) {
      sentence1 = `Sowing ${cropLower} on the default date had the fewest median stress days at the critical stage: ${minMedianStress}.`
    } else if (
      lowestShifts.length === 2 &&
      lowestShifts[0] === -14 &&
      lowestShifts[1] === -7
    ) {
      sentence1 = `Sowing ${cropLower} 7 to 14 days earlier had the fewest median stress days at the critical stage: ${minMedianStress}, against ${defaultMedian} on the default date.`
    } else if (
      lowestShifts.length === 2 &&
      lowestShifts[0] === 7 &&
      lowestShifts[1] === 14
    ) {
      sentence1 = `Sowing ${cropLower} 7 to 14 days later had the fewest median stress days at the critical stage: ${minMedianStress}, against ${defaultMedian} on the default date.`
    } else {
      const phrases = lowestShifts.map((s) =>
        s === 0 ? "on the default date" : shiftPhrase(s)
      )
      const joined = phrases.join(" and ")
      if (lowestShifts.includes(0)) {
        sentence1 = `Sowing ${cropLower} ${joined} had the fewest median stress days at the critical stage: ${minMedianStress}.`
      } else {
        sentence1 = `Sowing ${cropLower} ${joined} had the fewest median stress days at the critical stage: ${minMedianStress}, against ${defaultMedian} on the default date.`
      }
    }

    const M = campaigns.length
    const maxFewest = Math.max(...shiftResults.map((s) => s.fewestCount))
    const topShifts = shiftResults
      .filter((s) => s.fewestCount === maxFewest)
      .map((s) => s.days)

    let sentence2 = ""
    if (
      maxFewest === M &&
      topShifts.length === 1 &&
      topShifts[0] !== undefined
    ) {
      const topLabel =
        topShifts[0] === 0 ? "The default date" : shiftPhrase(topShifts[0])
      sentence2 = `${topLabel.charAt(0).toUpperCase() + topLabel.slice(1)} held up best in all ${M} campaigns.`
    } else {
      const topLabels = topShifts.map(shiftPhrase)
      if (topLabels.length === 1) {
        sentence2 = `No date held up best every year: ${topLabels[0]} did in ${maxFewest} of ${M} campaigns.`
      } else {
        sentence2 = `No date held up best every year: ${topLabels.join(" and ")} each did in ${maxFewest} of ${M} campaigns.`
      }
    }

    const headline = `${sentence1} ${sentence2}`

    results.push({
      crop: group.cropName,
      strategyIds: group.strategyIds,
      strategyLabels,
      sharingLine,
      headline,
      shifts: shiftResults,
      campaigns,
    })
  }

  return results
}

export function SowingWindow({
  bundle,
  water,
}: {
  bundle: CaseBundle
  water: WaterBlock
}) {
  const windows = computeSowingWindows(bundle, water)
  if (windows.length === 0) return null

  return (
    <View className="gap-6 px-4">
      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-light tracking-tight">
            Sowing window
          </Text>
          <InfoButton title="Sowing window">
            <View className="gap-4">
              <Text>
                Which summer sowing date held up best in the campaigns that
                started like this one, by days of water stress at the
                crop&apos;s critical stage.
              </Text>
              <Text>
                Days are stress days: days of water stress in the crop&apos;s
                mid-season (critical) stage.
              </Text>
              <EvidenceDetails
                meta={water.meta}
                scaleLabel={`Footprint ${water.field_id}`}
                sources={bundle.sources}
              />
              <Text className="font-medium">Limits of the sowing window</Text>
              <Text className="text-sm text-muted-foreground">
                One reference footprint ({water.field_id}) of Pergamino, 1 m of
                soil starting half full, NASA POWER weather. Not a sowing
                recommendation: check soil temperature, waterlogging and the
                cultivar on the lot.
              </Text>
              {water.limitations.map((limit) => (
                <Text key={limit} className="text-sm text-muted-foreground">
                  {limit}
                </Text>
              ))}
            </View>
          </InfoButton>
        </View>
        <Text className="text-sm text-muted-foreground">
          Which summer sowing date held up best in the campaigns that started
          like this one, by days of water stress at the crop&apos;s critical
          stage.
        </Text>
      </View>

      {windows.map((win) => (
        <View key={win.crop} className="gap-4">
          <Text className="text-sm text-muted-foreground">
            {win.sharingLine}
          </Text>

          <Text className="text-base text-foreground">{win.headline}</Text>

          <ListSection title="Shifts">
            {win.shifts.map((shift) => (
              <ListRow
                key={shift.days}
                title={`${shift.shiftTitle} · ${shift.dateLabel}`}
                subtitle={`${formatMm(shift.medianDeficitMm)} median deficit`}
                right={
                  <View className="items-end gap-1">
                    <Text
                      className={cn(
                        "text-sm",
                        shift.isBest
                          ? "font-medium text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {shift.medianStressDays} stress days · fewest in{" "}
                      {shift.fewestCount}/{win.campaigns.length}
                    </Text>
                    {shift.isBest && (
                      <View className="rounded bg-muted px-1.5 py-0.5">
                        <Text className="text-[10px] text-muted-foreground">
                          Lowest median
                        </Text>
                      </View>
                    )}
                  </View>
                }
              />
            ))}
          </ListSection>

          <ListSection title="By campaign">
            {win.campaigns.map((camp) => (
              <ListRow
                key={camp.scenarioId}
                title={camp.campaign}
                subtitle={`Default date: ${camp.defaultStressDays} stress days`}
                right={
                  <Text className="text-sm font-medium text-foreground">
                    fewest: {camp.bestShiftsLabel}, {camp.minStressDays} days
                  </Text>
                }
              />
            ))}
          </ListSection>
        </View>
      ))}

      <View className="gap-2">
        <Text className="text-xs text-muted-foreground">
          One reference footprint ({water.field_id}) of Pergamino, 1 m of soil
          starting half full, NASA POWER weather. Not a sowing recommendation:
          check soil temperature, waterlogging and the cultivar on the lot.
        </Text>
        <EvidenceChip meta={water.meta} />
      </View>
    </View>
  )
}
