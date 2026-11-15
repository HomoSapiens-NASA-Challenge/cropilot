import { View } from "react-native"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import {
  CROP_HISTORY_LIMITATIONS,
  type CropCampaign,
  type CropCategory,
  type CropClassShare,
} from "./field-data"

const CATEGORY_CLASSES: Record<CropCategory, string> = {
  "winter-cereal": "bg-chart-1",
  maize: "bg-chart-2",
  soybean: "bg-chart-3",
  fallow: "bg-chart-fallow",
  other: "bg-chart-other",
  "no-data": "bg-muted border border-border",
}

const LEGEND_ITEMS: { category: CropCategory; label: string }[] = [
  { category: "winter-cereal", label: "Winter cereal" },
  { category: "maize", label: "Maize" },
  { category: "soybean", label: "Soybean" },
  { category: "fallow", label: "Fallow" },
  { category: "other", label: "Other" },
  { category: "no-data", label: "No mapped class" },
]

function formatSeason(season: string): string {
  const s = season.toLowerCase()
  if (s === "annual") return "Annual"
  if (s === "winter") return "Winter"
  if (s === "summer") return "Summer"
  return season.charAt(0).toUpperCase() + season.slice(1)
}

function formatClassSummary(classes: CropClassShare[]): string {
  const dominant = classes[0]
  if (!dominant) return ""
  const first = `${dominant.labelOriginal} ${Math.round(dominant.fractionOfField * 100)}%`
  const second = classes[1]
  if (second && second.fractionOfField >= 0.15) {
    return `${first} · ${second.labelOriginal} ${Math.round(second.fractionOfField * 100)}%`
  }
  return first
}

export function CropHistoryChart({ campaigns }: { campaigns: CropCampaign[] }) {
  const limitationNote = CROP_HISTORY_LIMITATIONS[2]

  return (
    <View className="gap-4">
      {/* Legend */}
      <View className="flex-row flex-wrap gap-x-4 gap-y-2">
        {LEGEND_ITEMS.map((item) => (
          <View key={item.category} className="flex-row items-center gap-1.5">
            <View
              className={cn(
                "h-2.5 w-2.5 rounded-sm",
                CATEGORY_CLASSES[item.category]
              )}
            />
            <Text className="text-xs text-muted-foreground">{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Campaigns */}
      <View className="gap-3">
        {campaigns.map((camp) => (
          <View
            key={camp.campaign}
            className="gap-2 border-t border-border pt-3"
          >
            <Text className="text-sm font-medium text-foreground">
              {camp.campaign}
            </Text>
            <View className="gap-2.5">
              {camp.seasons.map((season) => {
                const visibleClasses = season.classes.filter(
                  (c) => c.fractionOfField >= 0.005
                )
                const summary = formatClassSummary(season.classes)

                return (
                  <View
                    key={season.mapId}
                    className="flex-row items-start gap-2"
                  >
                    <Text className="w-16 text-xs text-muted-foreground pt-0.5">
                      {formatSeason(season.season)}
                    </Text>
                    <View className="flex-1 gap-1">
                      <View className="flex-row h-3 gap-[2px]">
                        {visibleClasses.map((item, idx) => {
                          const isFirst = idx === 0
                          const isLast = idx === visibleClasses.length - 1
                          const roundedClass =
                            isFirst && isLast
                              ? "rounded-sm"
                              : isFirst
                                ? "rounded-l-sm"
                                : isLast
                                  ? "rounded-r-sm"
                                  : ""
                          return (
                            <View
                              key={`${season.mapId}-${item.category}-${idx}`}
                              className={cn(
                                "h-full",
                                CATEGORY_CLASSES[item.category],
                                roundedClass
                              )}
                              style={{
                                width: `${item.fractionOfField * 100}%`,
                              }}
                            />
                          )
                        })}
                      </View>
                      {summary ? (
                        <Text className="text-xs text-muted-foreground">
                          {summary}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                )
              })}
            </View>
          </View>
        ))}
      </View>

      {/* Limitation note */}
      {limitationNote ? (
        <Text className="text-xs text-muted-foreground border-t border-border pt-3">
          {limitationNote}
        </Text>
      ) : null}
    </View>
  )
}
