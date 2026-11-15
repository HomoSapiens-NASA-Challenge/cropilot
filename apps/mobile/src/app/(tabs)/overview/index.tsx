import { router, Stack } from "expo-router"
import { ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { ListRow, ListSection } from "@/components/list-row"
import { Text } from "@/components/ui/text"
import { CampaignStart, StartInfo } from "@/features/case/blocks/campaign-start"
import {
  NationalCampaign,
  NationalInfo,
} from "@/features/case/blocks/national-campaign"
import { CaseState } from "@/features/case/case-state"
import { CaseReferencesProvider } from "@/features/case/evidence-chip"
import { InfoButton } from "@/features/case/info-button"
import { askHref, caseHref, methodHref } from "@/features/case/routes"
import { useCaseBundle, useCaseIndex } from "@/features/case/use-case"
import { DEFAULT_ZONE_ID } from "@/features/case/zone"

export default function OverviewScreen() {
  const bundle = useCaseBundle(DEFAULT_ZONE_ID)
  const index = useCaseIndex()
  return (
    <SafeAreaView edges={["left", "right"]} className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerRight: () => (
            <InfoButton title="Home">
              {bundle.status === "ready" && (
                <CaseReferencesProvider
                  sources={bundle.data.sources}
                  glossary={bundle.data.glossary}
                >
                  <StartInfo bundle={bundle.data} />
                </CaseReferencesProvider>
              )}
              {index.status === "ready" && <NationalInfo index={index.data} />}
            </InfoButton>
          ),
        }}
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text className="px-4 pt-4 text-xl font-light tracking-tight">
          Welcome back
        </Text>
        {bundle.status === "ready" ? (
          <CaseReferencesProvider
            sources={bundle.data.sources}
            glossary={bundle.data.glossary}
          >
            <CampaignStart
              bundle={bundle.data}
              zoneId={DEFAULT_ZONE_ID}
              showZones={false}
            />
          </CaseReferencesProvider>
        ) : (
          <CaseState status={bundle.status} />
        )}
        <View className="px-4">
          <ListSection>
            <ListRow
              title="Pergamino"
              onPress={() => router.push(caseHref(DEFAULT_ZONE_ID))}
            />
          </ListSection>
          <ListSection>
            <ListRow
              title="Ask Cropilot"
              subtitle="Explore the evidence, with sources"
              onPress={() => router.push(askHref(DEFAULT_ZONE_ID))}
            />
          </ListSection>
        </View>
        {index.status === "ready" ? (
          <NationalCampaign
            index={index.data}
            zoneId={DEFAULT_ZONE_ID}
            preview
          />
        ) : (
          <CaseState status={index.status} />
        )}
        <View className="px-4 pb-4">
          <ListSection>
            <ListRow
              title="Method and limits"
              onPress={() => router.push(methodHref(DEFAULT_ZONE_ID))}
            />
          </ListSection>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
