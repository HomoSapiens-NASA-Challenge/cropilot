import { ScrollView, View } from "react-native"
import { Text } from "@/components/ui/text"
import { SOIL_DEPTHS, type SoilProfile } from "./field-data"

export function SoilTable({ profile }: { profile: SoilProfile }) {
  return (
    <View className="gap-2">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-col">
          {/* Header row */}
          <View className="flex-row items-center border-b border-border py-2">
            <Text className="w-36 text-sm font-medium text-muted-foreground">
              Property
            </Text>
            {SOIL_DEPTHS.map((depth) => {
              const formattedDepth = depth
                .replace("-", "–")
                .replace("cm", " cm")
              return (
                <Text
                  key={depth}
                  className="w-20 text-sm font-medium text-muted-foreground text-right"
                >
                  {formattedDepth}
                </Text>
              )
            })}
          </View>

          {/* Property rows */}
          {profile.properties.map((prop) => {
            const label =
              prop.unit === "-" ? prop.name : `${prop.name} (${prop.unit})`

            return (
              <View
                key={prop.property}
                className="flex-row items-center border-b border-border py-2"
              >
                <Text className="w-36 text-sm text-foreground">{label}</Text>
                {prop.byDepth.map((cell, idx) => {
                  const valText =
                    cell?.mean !== undefined && cell?.mean !== null
                      ? cell.mean.toFixed(1)
                      : "—"

                  return (
                    <Text
                      key={`${prop.property}-${idx}`}
                      className="w-20 text-sm text-foreground text-right"
                    >
                      {valText}
                    </Text>
                  )
                })}
              </View>
            )
          })}
        </View>
      </ScrollView>

      {/* Model point caption */}
      <Text className="text-xs text-muted-foreground">
        Mean of the SoilGrids model at one point ({profile.latitude.toFixed(4)},{" "}
        {profile.longitude.toFixed(4)}). Model estimate, not a soil test or
        whole-field mean.
      </Text>
    </View>
  )
}
