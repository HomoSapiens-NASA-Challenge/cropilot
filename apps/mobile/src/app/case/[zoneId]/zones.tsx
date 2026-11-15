import { Stack, useLocalSearchParams } from "expo-router"
import { ScrollView, View } from "react-native"
import {
  NationalCampaign,
  NationalInfo,
} from "@/features/case/blocks/national-campaign"
import { CaseState } from "@/features/case/case-state"
import { InfoButton } from "@/features/case/info-button"
import { useCaseIndex } from "@/features/case/use-case"
import { headerOptions } from "@/features/shell/header-options"

export default function ZonesScreen() {
  const { zoneId } = useLocalSearchParams<{ zoneId: string }>()
  const index = useCaseIndex()
  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          ...headerOptions,
          title: "Zones",
          headerRight: () =>
            index.status === "ready" ? (
              <InfoButton title="Across Argentina">
                <NationalInfo index={index.data} />
              </InfoButton>
            ) : null,
        }}
      />
      {index.status === "ready" ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <NationalCampaign index={index.data} zoneId={zoneId} />
        </ScrollView>
      ) : (
        <CaseState status={index.status} />
      )}
    </View>
  )
}
