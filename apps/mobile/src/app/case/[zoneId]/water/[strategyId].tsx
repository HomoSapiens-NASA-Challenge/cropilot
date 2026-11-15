import { Stack, useLocalSearchParams } from "expo-router"
import { ScrollView, View } from "react-native"
import { NotAvailable } from "@/features/case/block-section"
import { WaterStrategyDetail } from "@/features/case/blocks/compare/water-detail"
import { CaseState } from "@/features/case/case-state"
import { useCaseBundle } from "@/features/case/use-case"
import { headerOptions } from "@/features/shell/header-options"

/** A search parameter as a number, or the fallback when it is missing or not a number. */
function numberParam(value: string | undefined, fallback: number): number {
  const parsed = value === undefined ? Number.NaN : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export default function WaterStrategyScreen() {
  const { zoneId, strategyId, depth, fraction, shift, scenario } =
    useLocalSearchParams<{
      zoneId: string
      strategyId: string
      depth?: string
      fraction?: string
      shift?: string
      scenario?: string
    }>()
  const bundle = useCaseBundle(zoneId)
  const water =
    bundle.status === "ready" && bundle.data.modules.water === "available"
      ? bundle.data.compare.water
      : null
  const strategy =
    bundle.status === "ready"
      ? bundle.data.compare.strategies.find(
          (item) => item.strategy_id === strategyId
        )
      : undefined
  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{ ...headerOptions, title: strategy?.label ?? "Water" }}
      />
      {bundle.status !== "ready" ? (
        <CaseState status={bundle.status} />
      ) : water && strategy ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="p-4"
        >
          <WaterStrategyDetail
            water={water}
            strategy={strategy}
            campaigns={bundle.data.years_like_this.campaigns}
            settings={{
              depth_m: numberParam(depth, water.default_depth_m),
              initial_water_fraction: numberParam(
                fraction,
                water.default_initial_water_fraction
              ),
              summer_shift_days: numberParam(shift, 0),
            }}
            scenarioId={scenario ?? null}
          />
        </ScrollView>
      ) : (
        <View className="p-4">
          <NotAvailable description="The water runs exist for the Pergamino reference footprint only." />
        </View>
      )}
    </View>
  )
}
