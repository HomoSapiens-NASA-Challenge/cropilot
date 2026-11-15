import { View } from "react-native"
import { Text } from "@/components/ui/text"
import { GlowLine } from "@/features/landing/decor"
import { Band } from "@/features/landing/frame"

// Facts about the method and its two sources, not results for any field.
const METHOD_FACTS = [
  {
    value: "2",
    label: "signals, both known when the decision is made",
  },
  {
    value: "1981",
    label: "first year of daily soil water in NASA POWER",
  },
  {
    value: "1950",
    label: "first year of the NOAA Oceanic Niño Index",
  },
  {
    value: "3+",
    label: "rotations compared, the current one included",
  },
] as const

export function StatsSection() {
  return (
    <Band tone="tinted">
      <Text
        role="heading"
        className="px-4 py-20 text-center text-5xl font-light leading-none tracking-tighter"
      >
        Real campaigns, not a forecast
      </Text>
      {/* Two columns on a phone: four stacked facts made a long, empty scroll. */}
      <View className="relative flex-row flex-wrap border-y border-border">
        <GlowLine className="-top-px left-1/4 w-1/4" />
        {METHOD_FACTS.map((fact) => (
          <View
            key={fact.value}
            className="w-1/2 items-center gap-2 px-4 py-10"
          >
            <Text className="text-5xl font-light tracking-tighter">
              {fact.value}
            </Text>
            <Text className="text-center text-sm text-muted-foreground">
              {fact.label}
            </Text>
          </View>
        ))}
      </View>
      <View className="h-20" />
    </Band>
  )
}
