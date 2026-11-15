import { View } from "react-native"
import Svg, { Path, Polygon } from "react-native-svg"
import { Text } from "@/components/ui/text"
import {
  PlaceholderLine,
  PreviewWindow,
} from "@/features/landing/previews/preview-window"
import { SVG_COLORS } from "@/lib/theme"

// Made-up parcel shapes, drawn only to show how the map looks.
const LOTS = [
  { id: "a", points: "24,96 118,72 132,128 38,152", isFocused: false },
  { id: "b", points: "118,72 212,48 226,104 132,128", isFocused: true },
  { id: "c", points: "212,48 306,24 320,80 226,104", isFocused: false },
  { id: "d", points: "38,152 132,128 146,184 52,208", isFocused: false },
  { id: "e", points: "132,128 226,104 240,160 146,184", isFocused: false },
  { id: "f", points: "226,104 320,80 334,136 240,160", isFocused: false },
] as const

export function FarmMapPreview({ className }: { className?: string }) {
  return (
    <PreviewWindow title="Farm map" className={className}>
      <View className="relative">
        <Svg
          viewBox="0 0 360 232"
          aria-hidden
          width="100%"
          className="w-full rounded-lg bg-secondary"
          style={{ aspectRatio: 360 / 232 }}
        >
          <Path
            d="M0 40 C 90 60, 150 10, 360 34 M70 232 C 96 150, 60 90, 96 0"
            fill="none"
            strokeWidth={6}
            stroke={SVG_COLORS.card}
          />
          {LOTS.map((lot) => (
            <Polygon
              key={lot.id}
              points={lot.points}
              strokeWidth={1.5}
              strokeLinejoin="round"
              fill={lot.isFocused ? SVG_COLORS.primary : SVG_COLORS.card}
              fillOpacity={lot.isFocused ? 0.15 : 1}
              stroke={
                lot.isFocused ? SVG_COLORS.primary : SVG_COLORS.mutedForeground
              }
              strokeOpacity={lot.isFocused ? 1 : 0.4}
            />
          ))}
        </Svg>
        <View className="absolute bottom-3 right-3 w-40 flex-col gap-2 rounded-lg border border-background/80 bg-background p-3 shadow-sm">
          <PlaceholderLine className="h-2.5 w-16" />
          <PlaceholderLine className="w-24" />
          <Text className="text-[0.65rem] text-muted-foreground">
            Synthetic demo data
          </Text>
        </View>
      </View>
    </PreviewWindow>
  )
}
