import {
  type CaseBundle,
  type SowingWindow as SowingWindowData,
  sowingWindows,
  type WaterBlock,
} from "@cropilot/api"
import { View } from "react-native"
import { ListRow, ListSection } from "@/components/list-row"
import { Text } from "@/components/ui/text"
import { formatMm, formatShare } from "@/features/case/case-format"
import { EvidenceChip, EvidenceDetails } from "@/features/case/evidence-chip"
import { InfoButton } from "@/features/case/info-button"
import { cn } from "@/lib/utils"

const SHORT_DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
})

const DESCRIPTION =
  "Which summer sowing date held up best in the campaigns that started like this one, by days of water stress at the crop's critical stage."

// Hermes has no Intl.ListFormat.
function formatList(items: string[]): string {
  if (items.length <= 2) return items.join(" and ")
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`
}

function shiftLabel(days: number): string {
  if (days === 0) return "on the default date"
  return `${Math.abs(days)} days ${days < 0 ? "earlier" : "later"}`
}

function headline(window: SowingWindowData): string {
  const best = window.lowestMedianShifts
  const when =
    best.length > 1 && best.every((shift) => shift < 0)
      ? `${Math.min(...best.map(Math.abs))} to ${Math.max(...best.map(Math.abs))} days earlier`
      : formatList(best.map(shiftLabel))
  const lowest = `Sowing ${window.crop.toLowerCase()} ${when} had the fewest median stress days at the critical stage: ${window.lowestMedianStressDays}${best.includes(0) ? "." : `, against ${window.defaultMedianStressDays} on the default date.`}`
  const dates = formatList(window.topFewestShifts.map(shiftLabel))
  const total = window.campaigns.length
  const mostOften =
    window.topFewestCount === total
      ? `The best date was the same in every campaign: ${dates}.`
      : `No date held up best every year: ${dates} ${window.topFewestShifts.length > 1 ? "each did" : "did"} in ${window.topFewestCount} of ${total} campaigns.`
  return `${lowest} ${mostOften}`
}

export function SowingWindow({
  bundle,
  water,
}: {
  bundle: CaseBundle
  water: WaterBlock
}) {
  const windows = sowingWindows(bundle)
  if (windows.length === 0) return null
  const limits = `One reference footprint (${water.field_id}) of ${bundle.zone_name}, ${water.default_depth_m} m of soil starting at ${formatShare(water.default_initial_water_fraction)} of available water, NASA POWER weather. Not a sowing recommendation: check soil temperature, waterlogging and the cultivar on the lot.`

  return (
    <View className="gap-6 px-4">
      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-light tracking-tight">
            Sowing window
          </Text>
          <InfoButton title="Sowing window">
            <View className="gap-4">
              <Text>{DESCRIPTION}</Text>
              <Text>
                Stress days: days of water stress in the crop&apos;s mid-season
                (critical) stage. Dates use the median day of the year.
              </Text>
              <EvidenceDetails
                meta={water.meta}
                scaleLabel={`Footprint ${water.field_id}`}
                sources={bundle.sources}
              />
              <Text className="font-medium">Limits</Text>
              <Text className="text-sm text-muted-foreground">{limits}</Text>
              {water.limitations.map((limit) => (
                <Text key={limit} className="text-sm text-muted-foreground">
                  {limit}
                </Text>
              ))}
            </View>
          </InfoButton>
        </View>
        <Text className="text-sm text-muted-foreground">{DESCRIPTION}</Text>
      </View>

      {windows.map((window) => {
        const strategies = formatList(
          window.strategyIds.map(
            (id) =>
              bundle.compare.strategies.find(
                (strategy) => strategy.strategy_id === id
              )?.label ?? id
          )
        )
        const crop = window.crop.toLowerCase()
        const defaultIndex = window.shifts.findIndex(
          (shift) => shift.shiftDays === 0
        )
        return (
          <View key={window.strategyIds.join(",")} className="gap-4">
            <Text className="text-sm text-muted-foreground">
              {window.strategyIds.length > 1
                ? `In a season like this, ${strategies} all start with ${crop}, so they share this window.`
                : `In a season like this, ${strategies} starts with ${crop}.`}
            </Text>
            <Text className="text-base text-foreground">
              {headline(window)}
            </Text>

            <ListSection title="By sowing date">
              {window.shifts.map((shift) => {
                const isBest =
                  shift.medianStressDays === window.lowestMedianStressDays
                const label = shiftLabel(shift.shiftDays)
                return (
                  <ListRow
                    key={shift.shiftDays}
                    title={`${label.charAt(0).toUpperCase()}${label.slice(1)} · ${SHORT_DATE.format(new Date(`${shift.typicalSowingDate}T00:00:00Z`))}`}
                    subtitle={`${formatMm(shift.medianDeficitMm)} median deficit`}
                    right={
                      <View className="items-end gap-1">
                        <Text
                          className={cn(
                            "text-sm",
                            isBest
                              ? "font-medium text-foreground"
                              : "text-muted-foreground"
                          )}
                        >
                          {shift.medianStressDays} stress days · fewest in{" "}
                          {shift.fewestCount}/{window.campaigns.length}
                        </Text>
                        {isBest && (
                          <View className="rounded-full bg-muted px-1.5 py-0.5">
                            <Text className="text-xs text-muted-foreground">
                              Lowest median
                            </Text>
                          </View>
                        )}
                      </View>
                    }
                  />
                )
              })}
            </ListSection>

            <ListSection title="By campaign">
              {window.campaigns.map((campaign) => {
                const fewest = window.shifts
                  .filter(
                    (_, index) =>
                      campaign.cells[index]?.stressDays ===
                      campaign.fewestStressDays
                  )
                  .map((shift) => shiftLabel(shift.shiftDays))
                return (
                  <ListRow
                    key={campaign.campaign}
                    title={campaign.campaign}
                    subtitle={`Default date: ${campaign.cells[defaultIndex]?.stressDays} stress days`}
                    right={
                      <Text className="text-sm font-medium text-foreground">
                        Fewest {formatList(fewest)}, {campaign.fewestStressDays}{" "}
                        days
                      </Text>
                    }
                  />
                )
              })}
            </ListSection>
          </View>
        )
      })}

      <View className="gap-2">
        <Text className="text-xs text-muted-foreground">{limits}</Text>
        <EvidenceChip meta={water.meta} />
      </View>
    </View>
  )
}
