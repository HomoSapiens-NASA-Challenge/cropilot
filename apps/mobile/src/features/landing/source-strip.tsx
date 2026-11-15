import { View } from "react-native"
import { Text } from "@/components/ui/text"
import { Band } from "@/features/landing/frame"

// Names only, set in type: no agency logos.
const OPEN_DATA_NAMES = [
  "NASA POWER",
  "MERRA-2",
  "NOAA Climate Prediction Center",
  "Oceanic Niño Index",
] as const

export function SourceStrip() {
  return (
    <Band frameClassName="border-y">
      <View className="gap-4 px-4 py-7">
        <Text className="text-sm text-muted-foreground">
          Built on open data from
        </Text>
        <View className="flex-row flex-wrap items-center gap-x-10 gap-y-3">
          {OPEN_DATA_NAMES.map((name) => (
            <Text
              key={name}
              className="text-base font-medium tracking-tight text-foreground/70"
            >
              {name}
            </Text>
          ))}
        </View>
      </View>
    </Band>
  )
}
