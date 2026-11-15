import { useState } from "react"
import { Pressable, View } from "react-native"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { NDVI_LIMITATIONS, type NdviSample } from "./field-data"

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max)
}

export function NdviChart({ samples }: { samples: NdviSample[] }) {
  const [selectedIndex, setSelectedIndex] = useState(() =>
    Math.max(0, samples.length - 1)
  )

  const limitationNote = NDVI_LIMITATIONS[2]
  const selectedSample = samples[selectedIndex]

  if (samples.length === 0) {
    return (
      <Text className="text-sm text-muted-foreground">
        No NDVI observations available.
      </Text>
    )
  }

  return (
    <View className="gap-3">
      {/* Legend */}
      <View className="flex-row flex-wrap gap-x-4 gap-y-2">
        <View className="flex-row items-center gap-1.5">
          <View className="h-2.5 w-2.5 rounded-sm bg-primary" />
          <Text className="text-xs text-muted-foreground">
            ≥ 80% of footprint pixels valid
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="h-2.5 w-2.5 rounded-sm bg-primary/35" />
          <Text className="text-xs text-muted-foreground">
            Partial valid coverage
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="h-[2px] w-2.5 bg-muted-foreground/40" />
          <Text className="text-xs text-muted-foreground">
            No valid NDVI (gap, not interpolated)
          </Text>
        </View>
      </View>

      {/* Plot area */}
      <View>
        <View className="flex-row items-stretch">
          {/* Y-axis labels */}
          <View className="w-6 h-[120px] justify-between items-end pr-1.5 py-0">
            <Text className="text-[10px] text-muted-foreground leading-none">
              1.0
            </Text>
            <Text className="text-[10px] text-muted-foreground leading-none">
              0.5
            </Text>
            <Text className="text-[10px] text-muted-foreground leading-none">
              0
            </Text>
          </View>

          {/* Chart area with columns & gridlines */}
          <View className="flex-1 h-[120px] relative">
            {/* Recessive gridlines at top, middle, bottom */}
            <View
              pointerEvents="none"
              aria-hidden={true}
              className="absolute inset-0 justify-between"
            >
              <View className="border-t border-border w-full" />
              <View className="border-t border-border w-full" />
              <View className="border-t border-border w-full" />
            </View>

            {/* Sample columns */}
            <View className="flex-1 flex-row items-end h-[120px] gap-[1px]">
              {samples.map((sample, idx) => {
                const isSelected = idx === selectedIndex
                const valLabel =
                  sample.ndviMean !== null
                    ? `NDVI ${sample.ndviMean.toFixed(2)}`
                    : "no valid NDVI"
                const accessibilityLabel = `${sample.month}, ${valLabel}`

                return (
                  <Pressable
                    key={sample.month}
                    hitSlop={4}
                    accessibilityRole="button"
                    accessibilityLabel={accessibilityLabel}
                    onPress={() => setSelectedIndex(idx)}
                    className="flex-1 h-full justify-end items-stretch"
                  >
                    {sample.ndviMean === null ? (
                      <View
                        className={cn(
                          "w-full h-[2px]",
                          isSelected
                            ? "bg-foreground"
                            : "bg-muted-foreground/40"
                        )}
                      />
                    ) : (
                      <View
                        className={cn(
                          "w-full rounded-t-[2px]",
                          isSelected
                            ? "bg-foreground"
                            : sample.validFraction >= 0.8
                              ? "bg-primary"
                              : "bg-primary/35"
                        )}
                        style={{
                          height: `${clamp(sample.ndviMean, 0, 1) * 100}%`,
                        }}
                      />
                    )}
                  </Pressable>
                )
              })}
            </View>
          </View>
        </View>

        {/* X-axis year labels under first sample of each January */}
        <View className="flex-row">
          <View className="w-6" />
          <View className="flex-1 flex-row gap-[1px] h-4 mt-1">
            {samples.map((sample) => {
              const isJanuary = sample.month.endsWith("-01")
              return (
                <View
                  key={`year-${sample.month}`}
                  className="relative flex-1 overflow-visible"
                >
                  {isJanuary ? (
                    <View className="absolute top-0 left-0 w-10">
                      <Text className="text-[10px] text-muted-foreground">
                        {sample.month.slice(0, 4)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )
            })}
          </View>
        </View>
      </View>

      {/* Selected detail */}
      {selectedSample ? (
        <View className="gap-0.5 rounded-md border border-border bg-muted/20 p-2.5">
          <Text className="text-sm text-foreground">
            {selectedSample.ndviMean !== null
              ? `${selectedSample.acquiredUtc.slice(0, 10)} · NDVI ${selectedSample.ndviMean.toFixed(2)} · ${Math.round(selectedSample.validFraction * 100)}% of footprint pixels valid (${selectedSample.validPixelCount}/${selectedSample.fieldPixelCount})`
              : `${selectedSample.acquiredUtc.slice(0, 10)} · no valid NDVI pixels`}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {selectedSample.sceneId}
          </Text>
        </View>
      ) : null}

      {/* Limitation note */}
      {limitationNote ? (
        <Text className="text-xs text-muted-foreground">{limitationNote}</Text>
      ) : null}
    </View>
  )
}
