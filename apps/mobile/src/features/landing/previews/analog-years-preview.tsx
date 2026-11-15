import { Droplets, Waves } from "lucide-react-native"
import { View } from "react-native"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import {
  PlaceholderLine,
  PreviewWindow,
} from "@/features/landing/previews/preview-window"
import { cn } from "@/lib/utils"

// Positions are decorative: they do not stand for real campaigns.
const CAMPAIGN_TICK_COUNT = 44
const MATCHED_TICKS: ReadonlySet<number> = new Set([6, 17, 18, 29, 37])
const CAMPAIGN_TICKS = Array.from(
  { length: CAMPAIGN_TICK_COUNT },
  (_, index) => index
)
const MATCHED_ROWS = ["first", "second", "third"] as const

export function AnalogYearsPreview({ className }: { className?: string }) {
  return (
    <PreviewWindow title="Years like this" className={className}>
      <View className="flex-col gap-5">
        <View className="gap-3 sm:flex-row">
          <View className="flex-1 flex-row items-center gap-3 rounded-lg border border-border bg-background/70 p-3">
            <Icon
              as={Waves}
              className="size-4 shrink-0 text-primary"
              size={16}
            />
            <View className="min-w-0 flex-1 flex-col gap-2">
              <Text className="text-xs font-medium">El Niño phase</Text>
              <PlaceholderLine className="w-2/3" />
            </View>
          </View>
          <View className="flex-1 flex-row items-center gap-3 rounded-lg border border-border bg-background/70 p-3">
            <Icon
              as={Droplets}
              className="size-4 shrink-0 text-primary"
              size={16}
            />
            <View className="min-w-0 flex-1 flex-col gap-2">
              <Text className="text-xs font-medium">Soil water at start</Text>
              <PlaceholderLine className="w-1/2" />
            </View>
          </View>
        </View>
        <View className="flex-col gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-muted-foreground">
              Past campaigns
            </Text>
            <View className="flex-row items-center gap-1.5">
              <View aria-hidden className="size-1.5 rounded-full bg-primary" />
              <Text className="text-xs text-muted-foreground">
                Started like this one
              </Text>
            </View>
          </View>
          <View aria-hidden className="h-10 flex-row items-end gap-0.5">
            {CAMPAIGN_TICKS.map((tick) => (
              <View
                key={tick}
                style={{
                  height: MATCHED_TICKS.has(tick) ? "100%" : "60%",
                }}
                className={cn(
                  "flex-1 rounded-full",
                  MATCHED_TICKS.has(tick) ? "bg-primary" : "bg-border"
                )}
              />
            ))}
          </View>
        </View>
        <View className="flex-col divide-y divide-border">
          {MATCHED_ROWS.map((row) => (
            <View key={row} className="flex-row items-center gap-3 py-2.5">
              <View aria-hidden className="size-1.5 rounded-full bg-primary" />
              <PlaceholderLine className="w-24" />
              <PlaceholderLine className="ml-auto w-16" />
            </View>
          ))}
        </View>
      </View>
    </PreviewWindow>
  )
}
