import { Stack, useLocalSearchParams } from "expo-router"
import { ScrollView, View } from "react-native"
import { MethodLimits } from "@/features/case/blocks/method-limits"
import { CaseState } from "@/features/case/case-state"
import { useCaseBundle } from "@/features/case/use-case"
import { headerOptions } from "@/features/shell/header-options"

export default function MethodScreen() {
  const { zoneId } = useLocalSearchParams<{ zoneId: string }>()
  const bundle = useCaseBundle(zoneId)
  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{ ...headerOptions, title: "Method and limits" }}
      />
      {bundle.status === "ready" ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <MethodLimits bundle={bundle.data} />
        </ScrollView>
      ) : (
        <CaseState status={bundle.status} />
      )}
    </View>
  )
}
