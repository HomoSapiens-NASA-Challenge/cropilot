import { Stack, useLocalSearchParams } from "expo-router"
import { useState } from "react"
import { ScrollView, View } from "react-native"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Text } from "@/components/ui/text"
import { formatUsdPerHa } from "@/features/case/case-format"
import { CaseState } from "@/features/case/case-state"
import {
  CaseReferencesProvider,
  EvidenceDetails,
} from "@/features/case/evidence-chip"
import { useCaseBundle } from "@/features/case/use-case"
import { headerOptions } from "@/features/shell/header-options"
export default function CaseDetailScreen() {
  const { zoneId } = useLocalSearchParams<{ zoneId: string }>()
  const bundle = useCaseBundle(zoneId)
  const [kind, setKind] = useState<"gross" | "after_rent">("gross")
  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          ...headerOptions,
          title: "Who leads in each analog campaign",
        }}
      />
      {bundle.status !== "ready" ? (
        <CaseState status={bundle.status} />
      ) : (
        <CaseReferencesProvider sources={bundle.data.sources}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="gap-4 px-4 py-4">
              <SegmentedControl
                value={kind}
                onChange={setKind}
                options={[
                  { value: "gross", label: "Gross margin" },
                  { value: "after_rent", label: "After rent" },
                ]}
              />
              <Text>
                No strategy wins everywhere. The dot marks the highest margin of
                that campaign.
              </Text>
              {bundle.data.compare.analog_margins.map((analog) => (
                <View
                  key={analog.scenario_id}
                  className="gap-2 rounded-lg border border-border p-3"
                >
                  <Text className="font-medium">
                    {analog.campaign} · analog {analog.analog_rank}
                  </Text>
                  {bundle.data.compare.strategies.map((strategy) => {
                    const item = analog.margins.find(
                      (entry) => entry.strategy_id === strategy.strategy_id
                    )
                    const value =
                      kind === "gross"
                        ? item?.gross_margin_usd_ha
                        : item?.gross_margin_after_rent_usd_ha
                    const best = Math.max(
                      ...analog.margins
                        .map((entry) =>
                          kind === "gross"
                            ? entry.gross_margin_usd_ha
                            : entry.gross_margin_after_rent_usd_ha
                        )
                        .filter((value) => value !== null)
                    )
                    return (
                      <View
                        key={strategy.strategy_id}
                        className="flex-row justify-between gap-3"
                      >
                        <Text className="flex-1">{strategy.label}</Text>
                        <Text>
                          {value == null
                            ? "Missing"
                            : `${value === best ? "● " : ""}${formatUsdPerHa(value)}`}
                        </Text>
                      </View>
                    )
                  })}
                </View>
              ))}
              <EvidenceDetails
                meta={bundle.data.compare.margins_meta}
                horizon="One campaign, in each of the analog campaigns"
              />
            </View>
          </ScrollView>
        </CaseReferencesProvider>
      )}
    </View>
  )
}
