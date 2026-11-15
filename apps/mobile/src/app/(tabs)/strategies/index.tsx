import { Stack, useRouter } from "expo-router"
import { ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { ListRow } from "@/components/list-row"
import { Text } from "@/components/ui/text"
import { StrategyCompare } from "@/features/case/blocks/strategy-compare"
import { CaseState } from "@/features/case/case-state"
import { CaseReferencesProvider } from "@/features/case/evidence-chip"
import { InfoButton } from "@/features/case/info-button"
import { useCaseBundle } from "@/features/case/use-case"
import { DEFAULT_ZONE_ID } from "@/features/case/zone"
import { appSections } from "@/features/shell/sections"

export default function Screen() {
  const router = useRouter()
  const state = useCaseBundle(DEFAULT_ZONE_ID)
  return (
    <SafeAreaView edges={["left", "right"]} className="flex-1 bg-background">
      {state.status === "ready" && (
        <Stack.Screen
          options={{
            headerRight: () => (
              <InfoButton title="Compare rotations">
                <Text>{`${state.data.compare.strategies.length} rotations for ${state.data.zone_name}, side by side. Margins and water are shown for the real campaigns that started like ${state.data.years_like_this.current.campaign}.`}</Text>
                <Text>One toggle for the three rows below.</Text>
                <Text>Assumptions behind these margins</Text>
                {state.data.compare.margin_assumptions.map((item) => (
                  <Text key={item}>{item}</Text>
                ))}
                {state.data.compare.not_computed.map((item) => (
                  <Text key={item.metric}>
                    {item.metric} · Not computed: {item.reason}
                  </Text>
                ))}
              </InfoButton>
            ),
          }}
        />
      )}
      <ScrollView showsVerticalScrollIndicator={false}>
        {state.status === "ready" ? (
          <CaseReferencesProvider
            sources={state.data.sources}
            glossary={state.data.glossary}
          >
            <StrategyCompare bundle={state.data} zoneId={DEFAULT_ZONE_ID} />
          </CaseReferencesProvider>
        ) : (
          <CaseState status={state.status} />
        )}
        <View className="px-4 pb-4">
          <ListRow
            title={appSections.rotationPlanner.title}
            subtitle={appSections.rotationPlanner.description}
            accessibilityLabel="Open Rotation planner"
            onPress={() => router.push(appSections.rotationPlanner.href)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
