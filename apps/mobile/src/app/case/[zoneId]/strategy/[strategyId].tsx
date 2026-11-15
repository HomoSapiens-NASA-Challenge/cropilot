import type { Strategy } from "@cropilot/api"
import { Stack, useLocalSearchParams } from "expo-router"
import { useState } from "react"
import { Pressable, ScrollView, View } from "react-native"
import { Text } from "@/components/ui/text"
import {
  campaignName,
  formatMm,
  formatShare,
  formatUsdPerHa,
} from "@/features/case/case-format"
import { CaseState } from "@/features/case/case-state"
import {
  CaseReferencesProvider,
  EvidenceDetails,
} from "@/features/case/evidence-chip"
import { useCaseBundle } from "@/features/case/use-case"
import { headerOptions } from "@/features/shell/header-options"

const answers = [
  { key: "why", title: "Why it is suggested" },
  { key: "evidence", title: "The evidence behind it" },
  { key: "benefits", title: "The benefits it brings" },
  { key: "missing", title: "What information is missing" },
  { key: "local_review", title: "Check in the field" },
] as const satisfies ReadonlyArray<{
  key: keyof Strategy["answers"]
  title: string
}>
export default function CaseDetailScreen() {
  const { zoneId, strategyId } = useLocalSearchParams<{
    zoneId: string
    strategyId: string
  }>()
  const bundle = useCaseBundle(zoneId)
  const [open, setOpen] = useState(false)
  const strategy =
    bundle.status === "ready"
      ? bundle.data.compare.strategies.find(
          (item) => item.strategy_id === strategyId
        )
      : undefined
  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          ...headerOptions,
          title: strategy?.label ?? "Compare rotations",
        }}
      />
      {bundle.status !== "ready" ? (
        <CaseState status={bundle.status} />
      ) : strategy ? (
        <CaseReferencesProvider
          sources={bundle.data.sources}
          glossary={bundle.data.glossary}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="gap-4 px-4 py-4">
              {strategy.is_current && (
                <Text className="text-primary">Now · to confirm</Text>
              )}
              <Text>{strategy.sequence.join(" → ")}</Text>
              {strategy.current_note && (
                <Text className="text-muted-foreground">
                  {strategy.current_note}
                </Text>
              )}
              <Text className="font-medium">
                Margin in each analog campaign
              </Text>
              {bundle.data.compare.analog_margins.map((analog) => {
                const item = analog.margins.find(
                  (entry) => entry.strategy_id === strategyId
                )
                const gross = analog.margins
                  .map((entry) => entry.gross_margin_usd_ha)
                  .filter((value) => value !== null)
                const rent = analog.margins
                  .map((entry) => entry.gross_margin_after_rent_usd_ha)
                  .filter((value) => value !== null)
                return (
                  <View
                    key={analog.scenario_id}
                    className="gap-1 border-b border-border pb-3"
                  >
                    <Text className="font-medium">
                      {analog.campaign} · analog {analog.analog_rank}
                    </Text>
                    <Text>
                      Gross margin:{" "}
                      {item?.gross_margin_usd_ha == null
                        ? "Missing"
                        : `${item.gross_margin_usd_ha === Math.max(...gross) ? "● " : ""}${formatUsdPerHa(item.gross_margin_usd_ha)}`}
                    </Text>
                    <Text>
                      After rent:{" "}
                      {item?.gross_margin_after_rent_usd_ha == null
                        ? "Missing"
                        : `${item.gross_margin_after_rent_usd_ha === Math.max(...rent) ? "● " : ""}${formatUsdPerHa(item.gross_margin_after_rent_usd_ha)}`}
                    </Text>
                  </View>
                )
              })}
              <Text className="text-sm text-muted-foreground">
                The dot marks the highest margin of that campaign.
              </Text>
              <EvidenceDetails
                meta={bundle.data.compare.margins_meta}
                horizon="One campaign, in each of the analog campaigns"
              />
              <Text className="font-medium">
                Water: unmet crop water on the field footprint
              </Text>
              {bundle.data.compare.water &&
              strategy.water_strategy_id !== null ? (
                <>
                  <Text className="text-sm text-muted-foreground">
                    {strategy.water_match === "closest"
                      ? "Closest match: same crops, a different phase of the cycle."
                      : "Unmet crop water, analog episodes"}
                  </Text>
                  {bundle.data.compare.water.episodes
                    .filter(
                      (e) =>
                        e.strategy_id === strategyId &&
                        e.scenario_id !== null &&
                        e.depth_m ===
                          bundle.data.compare.water?.default_depth_m &&
                        e.initial_water_fraction ===
                          bundle.data.compare.water
                            ?.default_initial_water_fraction &&
                        e.summer_shift_days === 0
                    )
                    .map((e) => (
                      <Text key={e.run_id}>
                        {campaignName(e.start_year)}:{" "}
                        {formatShare(e.crop_demand_unmet_fraction)} ·{" "}
                        {formatMm(e.crop_et_deficit_mm)}
                      </Text>
                    ))}
                  <EvidenceDetails
                    meta={bundle.data.compare.water.meta}
                    scaleLabel={`Footprint ${bundle.data.compare.water.field_id}`}
                    horizon="Three continuous campaigns from June of the start year"
                  />
                </>
              ) : (
                <Text>
                  Water · Not computed. Cropilot has no water simulation for
                  this rotation.
                </Text>
              )}
              <Pressable
                className="min-h-11 justify-center border-t border-border"
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                onPress={() => setOpen(!open)}
              >
                <Text className="font-medium">
                  The five answers {open ? "−" : "+"}
                </Text>
              </Pressable>
              {open && (
                <>
                  <Text>
                    Why it is suggested, the evidence, the benefits, what is
                    missing and what to check in the field. Every claim names
                    its sources.
                  </Text>
                  {answers.map((answer) => (
                    <View key={answer.key} className="gap-2">
                      <Text className="font-medium">{answer.title}</Text>
                      {strategy.answers[answer.key].length ? (
                        strategy.answers[answer.key].map((claim) => (
                          <View key={claim.text} className="gap-2">
                            <Text>{claim.text}</Text>
                            <EvidenceDetails sourceIds={claim.source_ids} />
                          </View>
                        ))
                      ) : (
                        <Text>None listed.</Text>
                      )}
                    </View>
                  ))}
                </>
              )}
            </View>
          </ScrollView>
        </CaseReferencesProvider>
      ) : (
        <Text>Not found</Text>
      )}
    </View>
  )
}
