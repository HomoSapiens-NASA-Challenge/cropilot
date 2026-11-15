import { useState } from "react"
import { Pressable, View } from "react-native"
import Svg, { Circle, Line } from "react-native-svg"
import { Text } from "@/components/ui/text"
import { SVG_COLORS } from "@/lib/theme"

export type StripDot = {
  key: string
  value: number | null
  description: string
}
export function stripDomain(
  values: ReadonlyArray<number | null>
): [number, number] | null {
  const present = values.filter((value) => value !== null)
  if (!present.length) return null
  const min = Math.min(...present),
    max = Math.max(...present)
  const padding = (max - min || Math.abs(max) || 1) * 0.06
  return [min - padding, max + padding]
}
export function DotStrip({
  dots,
  domain,
  format,
  compact = false,
}: {
  dots: ReadonlyArray<StripDot>
  domain: [number, number] | null
  format: (value: number) => string
  compact?: boolean
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [width, setWidth] = useState(0)
  const present = dots.filter((dot) => dot.value !== null)
  if (!domain || !present.length)
    return (
      <Text className="text-sm text-muted-foreground">
        No value for any of the {dots.length} campaigns.
      </Text>
    )
  const position = (value: number) =>
    22 +
    ((value - domain[0]) / (domain[1] - domain[0])) * Math.max(0, width - 44)
  const values = present.map((dot) => dot.value ?? 0)
  return (
    <View className="gap-1">
      <View
        className="relative h-11"
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        <Svg width={width} height={44}>
          <Line
            x1={22}
            x2={Math.max(22, width - 22)}
            y1={22}
            y2={22}
            stroke={SVG_COLORS.border}
            strokeWidth={1}
          />
          {domain[0] < 0 && domain[1] > 0 && (
            <Line
              x1={position(0)}
              x2={position(0)}
              y1={10}
              y2={34}
              stroke={SVG_COLORS.mutedForeground}
              strokeWidth={1}
            />
          )}
          {present.map((dot) => (
            <Circle
              key={dot.key}
              cx={position(dot.value ?? 0)}
              cy={22}
              r={4}
              fill={SVG_COLORS.primary}
            />
          ))}
        </Svg>
        {present.map((dot) => (
          <Pressable
            key={dot.key}
            accessibilityRole="button"
            accessibilityLabel={dot.description}
            onPress={() => setSelected(dot.description)}
            style={{
              position: "absolute",
              left: position(dot.value ?? 0) - 22,
              top: 0,
              width: 44,
              height: 44,
            }}
          />
        ))}
      </View>
      {!compact && (
        <View className="flex-row justify-between">
          <Text className="text-xs text-muted-foreground">
            {format(Math.min(...values))}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {format(Math.max(...values))}
          </Text>
        </View>
      )}
      {selected && <Text className="text-sm">{selected}</Text>}
      {dots.length > present.length && (
        <Text className="text-xs text-muted-foreground">
          {dots.length - present.length}{" "}
          {dots.length - present.length === 1
            ? "campaign has"
            : "campaigns have"}{" "}
          no value.
        </Text>
      )}
    </View>
  )
}
