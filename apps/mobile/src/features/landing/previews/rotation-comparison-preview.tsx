import { Sprout } from "lucide-react-native"
import { View } from "react-native"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import {
  PlaceholderLine,
  PreviewWindow,
} from "@/features/landing/previews/preview-window"

const ROTATIONS = [
  { label: "Current rotation", isCurrent: true },
  { label: "Alternative A", isCurrent: false },
  { label: "Alternative B", isCurrent: false },
] as const

const STRATEGY_ANSWERS = [
  "Why",
  "Evidence",
  "Benefits",
  "Missing",
  "Local review",
] as const

export function RotationComparisonPreview({
  className,
}: {
  className?: string
}) {
  return (
    <PreviewWindow title="Strategies" className={className}>
      <View className="flex-col gap-4">
        <View className="flex-col divide-y divide-border">
          {ROTATIONS.map((rotation) => (
            <View key={rotation.label} className="flex-col gap-2.5 py-3">
              <View className="flex-row items-center gap-2">
                <Icon
                  as={Sprout}
                  className={
                    rotation.isCurrent
                      ? "size-4 shrink-0 text-primary"
                      : "size-4 shrink-0 text-muted-foreground"
                  }
                  size={16}
                />
                <Text className="text-sm font-medium">{rotation.label}</Text>
                {rotation.isCurrent && (
                  <Badge variant="secondary" className="ml-auto">
                    <Text>Today</Text>
                  </Badge>
                )}
              </View>
              <View className="flex-row gap-2">
                <PlaceholderLine className="flex-1" />
                <PlaceholderLine className="flex-1" />
                <PlaceholderLine className="flex-1" />
              </View>
            </View>
          ))}
        </View>
        <View className="flex-row flex-wrap gap-1.5">
          {STRATEGY_ANSWERS.map((answer) => (
            <Badge key={answer} variant="outline" className="bg-background/60">
              <Text>{answer}</Text>
            </Badge>
          ))}
        </View>
      </View>
    </PreviewWindow>
  )
}
