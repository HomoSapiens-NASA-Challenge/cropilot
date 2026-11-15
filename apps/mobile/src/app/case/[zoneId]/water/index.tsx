import { Stack, useLocalSearchParams } from "expo-router"
import { ScrollView, View } from "react-native"
import {
  WaterDetail,
  WaterInfo,
} from "@/features/case/blocks/compare/water-detail"
import { CaseState } from "@/features/case/case-state"
import { CaseReferencesProvider } from "@/features/case/evidence-chip"
import { InfoButton } from "@/features/case/info-button"
import { useCaseBundle } from "@/features/case/use-case"
import { headerOptions } from "@/features/shell/header-options"

export default function WaterScreen() {
  const { zoneId } = useLocalSearchParams<{ zoneId: string }>()
  const bundle = useCaseBundle(zoneId)
  const water =
    bundle.status === "ready" && bundle.data.modules.water === "available"
      ? bundle.data.compare.water
      : null
  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          ...headerOptions,
          title: "Water",
          headerRight:
            water && bundle.status === "ready"
              ? () => (
                  <InfoButton title="Water: unmet crop water on the field footprint">
                    <WaterInfo water={water} sources={bundle.data.sources} />
                  </InfoButton>
                )
              : undefined,
        }}
      />
      {bundle.status !== "ready" ? (
        <CaseState status={bundle.status} />
      ) : (
        <CaseReferencesProvider sources={bundle.data.sources}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <WaterDetail bundle={bundle.data} zoneId={zoneId} />
          </ScrollView>
        </CaseReferencesProvider>
      )}
    </View>
  )
}
