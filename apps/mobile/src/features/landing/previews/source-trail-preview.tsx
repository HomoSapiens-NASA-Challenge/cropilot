import { FileSearch } from "lucide-react-native"
import { View } from "react-native"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import {
  PlaceholderLine,
  PreviewWindow,
} from "@/features/landing/previews/preview-window"

// The source line is real: it is the one Cropilot shows for soil water.
const SOURCE_FIELDS = [
  { label: "Dataset", value: "NASA POWER · GWETROOT" },
  { label: "Period", value: "Daily, since 1981" },
  { label: "Location", value: "Grid cell of about 55 × 57 km" },
] as const

export function SourceTrailPreview({ className }: { className?: string }) {
  return (
    <PreviewWindow title="Soil water at start" className={className}>
      <View className="flex-col gap-4">
        <View className="flex-col gap-2.5">
          <PlaceholderLine className="h-3 w-20" />
          <PlaceholderLine className="w-2/3" />
        </View>
        <View className="flex-col divide-y divide-border rounded-lg border border-border bg-background/70">
          {SOURCE_FIELDS.map((field) => (
            <View
              key={field.label}
              className="flex-row items-baseline justify-between gap-4 px-3 py-2"
            >
              <Text className="text-xs text-muted-foreground">
                {field.label}
              </Text>
              <Text className="text-right text-xs font-medium">
                {field.value}
              </Text>
            </View>
          ))}
        </View>
        <View className="flex-row items-center gap-1.5">
          <Icon as={FileSearch} className="size-3.5 text-primary" size={14} />
          <Text className="text-xs text-primary">Open the raw series</Text>
        </View>
      </View>
    </PreviewWindow>
  )
}
