import { Stack, useLocalSearchParams } from "expo-router"
import { ScrollView, View } from "react-native"
import { Text } from "@/components/ui/text"
import { NotAvailable } from "@/features/case/block-section"
import { NdviChart } from "@/features/case/blocks/field/ndvi-chart"
import { formatMm, formatShare } from "@/features/case/case-format"
import { CaseState } from "@/features/case/case-state"
import {
  CaseReferencesProvider,
  EvidenceDetails,
} from "@/features/case/evidence-chip"
import { useCaseBundle } from "@/features/case/use-case"
import { headerOptions } from "@/features/shell/header-options"

const seasons = {
  annual: "Annual",
  winter: "Winter",
  summer: "Summer",
} as const

export default function FootprintScreen() {
  const { zoneId } = useLocalSearchParams<{ zoneId: string }>()
  const bundle = useCaseBundle(zoneId)
  const field = bundle.status === "ready" ? bundle.data.field : null
  const reference = field?.reference_field
  const coverage = reference
    ? reference.ndvi.reduce((sum, item) => sum + item.valid_fraction, 0) /
      Math.max(reference.ndvi.length, 1)
    : 0
  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          ...headerOptions,
          title: reference
            ? `Reference footprint ${reference.field_id}`
            : "The field",
        }}
      />
      {bundle.status !== "ready" ? (
        <CaseState status={bundle.status} />
      ) : !field || !reference ? (
        <View className="p-4">
          <NotAvailable />
        </View>
      ) : (
        <CaseReferencesProvider
          sources={bundle.data.sources}
          glossary={bundle.data.glossary}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerClassName="gap-4 p-4"
          >
            <Text className="text-sm text-muted-foreground">
              {reference.note}
            </Text>
            <Text>{reference.area_ha.toFixed(1)} ha</Text>
            <Text className="font-medium">INTA crop history</Text>
            {reference.crop_history.map((entry) => (
              <Text
                key={`${entry.campaign}-${entry.season}-${entry.crop}`}
                className="text-sm"
              >
                {entry.campaign} · {seasons[entry.season]} · {entry.crop} ·{" "}
                {formatShare(entry.fraction_of_field)}
              </Text>
            ))}
            <Text className="font-medium">Monthly NDVI</Text>
            <NdviChart
              months={reference.ndvi.map((item) => item.month)}
              lot={reference.ndvi.map((item) => item.ndvi_mean)}
              zone={[]}
            />
            <Text className="text-xs text-muted-foreground">
              {reference.ndvi.filter((item) => item.ndvi_mean !== null).length}{" "}
              monthly values out of {reference.ndvi.length} months. Valid
              coverage averages {formatShare(coverage)} of the footprint.
            </Text>
            <Text className="font-medium">Soil water capacity by depth</Text>
            {reference.soil_capacity.map((item) => (
              <Text key={item.depth_m} className="text-sm">
                {item.depth_m} m · {formatMm(item.capacity_mm)}
              </Text>
            ))}
            {field.reference_meta && (
              <EvidenceDetails meta={field.reference_meta} />
            )}
          </ScrollView>
        </CaseReferencesProvider>
      )}
    </View>
  )
}
