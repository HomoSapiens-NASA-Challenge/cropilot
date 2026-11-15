import { View } from "react-native"
import { Badge } from "@/components/ui/badge"
import { Text } from "@/components/ui/text"
import {
  PlaceholderLine,
  PreviewWindow,
} from "@/features/landing/previews/preview-window"

const CITED_SOURCES = ["NASA POWER · GWETROOT", "NOAA · ONI"] as const

export function AssistantPreview({ className }: { className?: string }) {
  return (
    <PreviewWindow title="Assistant" className={className}>
      <View className="flex-col gap-3">
        <View className="ml-auto max-w-4/5 rounded-xl rounded-br-xs bg-primary px-3 py-2">
          <Text className="text-sm text-primary-foreground">
            Why is this rotation suggested?
          </Text>
        </View>
        <View className="flex max-w-11/12 flex-col gap-2.5 rounded-xl rounded-bl-xs border border-border bg-background/70 px-3 py-3">
          <PlaceholderLine />
          <PlaceholderLine className="w-5/6" />
          <PlaceholderLine className="w-2/3" />
          <View className="flex-row flex-wrap gap-1.5 pt-1">
            {CITED_SOURCES.map((source) => (
              <Badge key={source} variant="outline">
                <Text>{source}</Text>
              </Badge>
            ))}
          </View>
        </View>
      </View>
    </PreviewWindow>
  )
}
