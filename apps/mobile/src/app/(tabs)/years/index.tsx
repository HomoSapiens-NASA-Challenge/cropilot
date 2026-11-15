import { Stack } from "expo-router"
import { ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { HideBlockHeaders } from "@/features/case/block-section"
import {
  YearsInfo,
  YearsLikeThis,
} from "@/features/case/blocks/years-like-this"
import { CaseState } from "@/features/case/case-state"
import { CaseReferencesProvider } from "@/features/case/evidence-chip"
import { InfoButton } from "@/features/case/info-button"
import { useCaseBundle } from "@/features/case/use-case"
import { DEFAULT_ZONE_ID } from "@/features/case/zone"

export default function Screen() {
  const state = useCaseBundle(DEFAULT_ZONE_ID)
  return (
    <SafeAreaView edges={["left", "right"]} className="flex-1 bg-background">
      {state.status === "ready" && (
        <Stack.Screen
          options={{
            headerRight: () => (
              <CaseReferencesProvider
                sources={state.data.sources}
                glossary={state.data.glossary}
              >
                <InfoButton title="Years like this">
                  <YearsInfo bundle={state.data} />
                </InfoButton>
              </CaseReferencesProvider>
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
            <HideBlockHeaders>
              <YearsLikeThis bundle={state.data} zoneId={DEFAULT_ZONE_ID} />
            </HideBlockHeaders>
          </CaseReferencesProvider>
        ) : (
          <CaseState status={state.status} />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
