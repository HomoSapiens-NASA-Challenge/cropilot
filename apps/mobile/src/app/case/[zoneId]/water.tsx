import { Stack, useLocalSearchParams } from "expo-router"
import { ScrollView, View } from "react-native"
import { WaterDetail } from "@/features/case/blocks/compare/water-detail"
import { CaseState } from "@/features/case/case-state"
import { CaseReferencesProvider } from "@/features/case/evidence-chip"
import { useCaseBundle } from "@/features/case/use-case"
import { headerOptions } from "@/features/shell/header-options"
export default function CaseDetailScreen() {
  const { zoneId } = useLocalSearchParams<{ zoneId: string }>()
  const bundle = useCaseBundle(zoneId)
  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ ...headerOptions, title: "Water" }} />
      {bundle.status !== "ready" ? (
        <CaseState status={bundle.status} />
      ) : (
        <CaseReferencesProvider sources={bundle.data.sources}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <WaterDetail bundle={bundle.data} />
          </ScrollView>
        </CaseReferencesProvider>
      )}
    </View>
  )
}
