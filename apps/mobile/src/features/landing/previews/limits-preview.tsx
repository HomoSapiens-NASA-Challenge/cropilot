import { View } from "react-native"
import { Text } from "@/components/ui/text"
import { PreviewWindow } from "@/features/landing/previews/preview-window"

const MEASURED_ROWS = [
  { label: "Beat random sets of 7 years", value: "p = 0.007" },
  { label: "Where the signal shows", value: "Marcos Juárez, Río Cuarto" },
  {
    label: "Planner vs best fixed rotation",
    value: "-3 USD/ha/year (95% CI -8 to +3)",
  },
] as const

export function LimitsPreview({ className }: { className?: string }) {
  return (
    <PreviewWindow
      title="Measured limits"
      badge="Team backtests"
      className={className}
    >
      <View className="gap-4">
        <View className="gap-1">
          <Text className="text-xs font-medium">
            Years like this against climatology, margin backtest
          </Text>
          <Text className="text-3xl font-light tracking-tight">-0.7%</Text>
          <Text className="text-xs text-muted-foreground">
            error against climatology: a tie. 7 analogs per campaign, 307
            campaigns, 10 zones.
          </Text>
        </View>
        <View className="rounded-lg border border-border bg-background/70">
          {MEASURED_ROWS.map((row) => (
            <View
              key={row.label}
              className="flex-row justify-between gap-4 border-b border-border px-3 py-2"
            >
              <Text className="flex-1 text-xs text-muted-foreground">
                {row.label}
              </Text>
              <Text className="flex-1 text-right text-xs font-medium">
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </PreviewWindow>
  )
}
