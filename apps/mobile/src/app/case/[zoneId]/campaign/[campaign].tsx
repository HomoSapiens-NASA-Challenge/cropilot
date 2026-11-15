import { Stack, useLocalSearchParams } from "expo-router"
import { ScrollView, View } from "react-native"
import { Text } from "@/components/ui/text"
import { YIELD_CROP_LABEL, yieldOf } from "@/features/case/blocks/years/scatter"
import { NOTE_KIND_LABEL } from "@/features/case/blocks/years-like-this"
import {
  ENSO_PHASE_LABEL,
  formatPercentSigned,
  formatSigned,
  formatWetness,
  PROVENANCE,
} from "@/features/case/case-format"
import { CaseState } from "@/features/case/case-state"
import {
  CaseReferencesProvider,
  EvidenceDetails,
} from "@/features/case/evidence-chip"
import { campaignFromSlug } from "@/features/case/routes"
import { useCaseBundle } from "@/features/case/use-case"
import { headerOptions } from "@/features/shell/header-options"

export default function CaseDetailScreen() {
  const { zoneId, campaign } = useLocalSearchParams<{
    zoneId: string
    campaign: string
  }>()
  const bundle = useCaseBundle(zoneId)
  const label = campaignFromSlug(campaign)
  const point =
    bundle.status === "ready"
      ? bundle.data.years_like_this.campaigns.find(
          (item) => item.campaign === label
        )
      : undefined
  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ ...headerOptions, title: label }} />
      {bundle.status !== "ready" ? (
        <CaseState status={bundle.status} />
      ) : point ? (
        <CaseReferencesProvider
          sources={bundle.data.sources}
          glossary={bundle.data.glossary}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerClassName="gap-4 px-4 py-4"
          >
            {point.is_analog && (
              <Text>
                Analog {point.analog_rank} · Distance:{" "}
                {point.analog_distance === null
                  ? "Missing"
                  : point.analog_distance.toFixed(2)}
              </Text>
            )}
            <Text>
              Phase (July to September): {ENSO_PHASE_LABEL[point.enso_phase]}
            </Text>
            <Text>ONI: {formatSigned(point.oni_jas)}</Text>
            <Text>
              Soil wetness, end of August:{" "}
              {point.soil_wetness_end_aug === null
                ? "Missing"
                : formatWetness(point.soil_wetness_end_aug)}
            </Text>
            <EvidenceDetails
              meta={bundle.data.years_like_this.signals}
              horizon="ONI July to September, soil wetness 22 to 31 August"
            />
            {(["maize", "soybean"] as const).map((crop) => {
              const result = yieldOf(point, crop)
              return (
                <Text key={crop}>
                  {YIELD_CROP_LABEL[crop]} yield vs trend:{" "}
                  {result.anomalyPct === null
                    ? "Missing"
                    : formatPercentSigned(result.anomalyPct)}{" "}
                  · {PROVENANCE[result.provenance].label}
                </Text>
              )
            })}
            <EvidenceDetails
              meta={bundle.data.years_like_this.yields}
              horizon="One campaign, anomaly against the trend"
            />
            {point.notes.map((note) => (
              <View key={note.kind} className="gap-2">
                <Text className="font-medium">
                  {label} · {NOTE_KIND_LABEL[note.kind]}
                </Text>
                <Text>{note.text}</Text>
                <EvidenceDetails sourceIds={note.source_ids} />
              </View>
            ))}
          </ScrollView>
        </CaseReferencesProvider>
      ) : (
        <Text className="p-4">Not available for this region yet</Text>
      )}
    </View>
  )
}
