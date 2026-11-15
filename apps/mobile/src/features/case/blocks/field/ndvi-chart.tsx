import { View } from "react-native"
import Svg, { Line, Polyline } from "react-native-svg"
import { Text } from "@/components/ui/text"
import { SVG_COLORS } from "@/lib/theme"

export function NdviChart({
  months,
  lot,
  zone,
}: {
  months: string[]
  lot: (number | null)[]
  zone: (number | null)[]
}) {
  const values = [...lot, ...zone].filter(
    (value): value is number => value !== null
  )
  if (!values.length) return <Text>Missing</Text>
  const segments = (series: (number | null)[]) => {
    const groups: string[][] = [[]]
    series.forEach((value, index) => {
      if (value === null) {
        groups.push([])
        return
      }
      groups[groups.length - 1]?.push(
        `${10 + (index * 300) / Math.max(months.length - 1, 1)},${100 - value * 90}`
      )
    })
    return groups.filter((group) => group.length > 0)
  }
  return (
    <View className="gap-2">
      <View className="relative">
        <Svg
          width="100%"
          height={110}
          viewBox="0 0 320 110"
          preserveAspectRatio="none"
        >
          <Line x1={10} y1={100} x2={310} y2={100} stroke={SVG_COLORS.border} />
          {[lot, zone].map((series, index) =>
            segments(series).map((group) => (
              <Polyline
                key={`${index}-${group.join(" ")}`}
                points={group.join(" ")}
                fill="none"
                stroke={
                  index === 0 ? SVG_COLORS.primary : SVG_COLORS.mutedForeground
                }
                strokeWidth={1.5}
                strokeDasharray={index === 1 ? "4 3" : undefined}
              />
            ))
          )}
        </Svg>
        <Text className="absolute top-0 left-0 text-xs text-muted-foreground">
          1.0
        </Text>
        <Text className="absolute bottom-0 left-0 text-xs text-muted-foreground">
          0
        </Text>
      </View>
      <View className="flex-row justify-between">
        <Text className="text-xs text-muted-foreground">{months[0]}</Text>
        <Text className="text-xs text-muted-foreground">
          {months[months.length - 1]}
        </Text>
      </View>
    </View>
  )
}
