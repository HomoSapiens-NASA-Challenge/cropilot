import { Stack } from "expo-router"
import { ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { FieldInfo, FieldView } from "@/features/case/blocks/field-view"
import { CaseState } from "@/features/case/case-state"
import { CaseReferencesProvider } from "@/features/case/evidence-chip"
import { InfoButton } from "@/features/case/info-button"
import { useCaseBundle } from "@/features/case/use-case"
import { DEFAULT_ZONE_ID } from "@/features/case/zone"

export default function Screen() {
  const state = useCaseBundle(DEFAULT_ZONE_ID)
  return (
    <SafeAreaView edges={["left", "right"]} className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerRight: () =>
            state.status === "ready" ? (
              <InfoButton title="The field">
                <FieldInfo bundle={state.data} />
              </InfoButton>
            ) : null,
        }}
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        {state.status === "ready" ? (
          <CaseReferencesProvider
            sources={state.data.sources}
            glossary={state.data.glossary}
          >
            <FieldView bundle={state.data} zoneId={DEFAULT_ZONE_ID} />
          </CaseReferencesProvider>
        ) : (
          <CaseState status={state.status} />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
