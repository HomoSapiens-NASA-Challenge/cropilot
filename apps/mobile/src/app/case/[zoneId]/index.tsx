import { router, Stack, useLocalSearchParams } from "expo-router"
import { useState } from "react"
import { Pressable, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { ListRow, ListSection } from "@/components/list-row"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Text } from "@/components/ui/text"
import { HideBlockHeaders, NotAvailable } from "@/features/case/block-section"
import { CampaignStart, StartInfo } from "@/features/case/blocks/campaign-start"
import { FieldView } from "@/features/case/blocks/field-view"
import { StrategyCompare } from "@/features/case/blocks/strategy-compare"
import { YearsLikeThis } from "@/features/case/blocks/years-like-this"
import { CaseState } from "@/features/case/case-state"
import { CaseReferencesProvider } from "@/features/case/evidence-chip"
import { InfoButton } from "@/features/case/info-button"
import { askHref, caseHref, methodHref } from "@/features/case/routes"
import { useCaseBundle, useCaseIndex } from "@/features/case/use-case"
import { DEFAULT_ZONE_ID } from "@/features/case/zone"

const segments = [
  { value: "start", label: "Start" },
  { value: "years", label: "Years" },
  { value: "compare", label: "Compare" },
  { value: "field", label: "Field" },
] as const
export default function CaseScreen() {
  const { zoneId } = useLocalSearchParams<{ zoneId: string }>()
  const bundle = useCaseBundle(zoneId)
  const index = useCaseIndex()
  const [active, setActive] =
    useState<(typeof segments)[number]["value"]>("start")
  return (
    <SafeAreaView edges={["left", "right"]} className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: bundle.status === "ready" ? bundle.data.zone_name : "Case",
          headerRight: () =>
            bundle.status === "ready" ? (
              <InfoButton title="Case">
                <Text>
                  {index.status === "ready"
                    ? `${index.data.campaign} case, ${bundle.data.zone_name} · public, read-only, no sign-in`
                    : bundle.data.zone_name}
                </Text>
                {index.status === "ready" && (
                  <Text>
                    Real campaigns that started like {index.data.campaign}, not
                    a forecast.
                  </Text>
                )}
                <Text>
                  Cropilot supports the agronomist and the producer. It shows
                  what happened to each rotation in the past campaigns that
                  began like this one, and it names the source of every number.
                </Text>
                <CaseReferencesProvider
                  sources={bundle.data.sources}
                  glossary={bundle.data.glossary}
                >
                  <StartInfo bundle={bundle.data} />
                </CaseReferencesProvider>
              </InfoButton>
            ) : null,
        }}
      />
      {bundle.status === "ready" ? (
        <CaseReferencesProvider
          sources={bundle.data.sources}
          glossary={bundle.data.glossary}
        >
          <View className="px-4 pt-3">
            <SegmentedControl
              value={active}
              onChange={setActive}
              options={segments}
            />
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <HideBlockHeaders>
              {active === "start" && (
                <>
                  <CampaignStart bundle={bundle.data} zoneId={zoneId} />
                  <View className="px-4">
                    <Pressable
                      accessibilityRole="button"
                      className="min-h-11 justify-center"
                      onPress={() => router.push(methodHref(zoneId))}
                    >
                      <Text className="text-primary">Method and limits</Text>
                    </Pressable>
                  </View>
                </>
              )}
              {active === "years" && (
                <YearsLikeThis bundle={bundle.data} zoneId={zoneId} />
              )}
              {active === "compare" && (
                <StrategyCompare bundle={bundle.data} zoneId={zoneId} />
              )}
              {active === "field" && (
                <FieldView bundle={bundle.data} zoneId={zoneId} />
              )}
            </HideBlockHeaders>
            <View className="px-4 pb-4">
              <ListSection>
                <ListRow
                  title="Ask Cropilot"
                  subtitle="Explore the evidence, with sources"
                  onPress={() => router.push(askHref(zoneId))}
                />
              </ListSection>
            </View>
          </ScrollView>
        </CaseReferencesProvider>
      ) : bundle.status === "notFound" ? (
        <View className="px-4 py-8">
          <NotAvailable
            title="No case data for this region yet"
            description={`There is no 2026/27 case for "${zoneId}". The reference case, Pergamino, has every block.`}
          >
            <Pressable
              accessibilityRole="link"
              className="min-h-11 justify-center px-3"
              onPress={() => router.push(caseHref(DEFAULT_ZONE_ID))}
            >
              <Text className="text-primary">Open the Pergamino case</Text>
            </Pressable>
          </NotAvailable>
        </View>
      ) : (
        <CaseState status={bundle.status} />
      )}
    </SafeAreaView>
  )
}
