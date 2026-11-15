import { Stack, useLocalSearchParams } from "expo-router"
import { ScrollView, View } from "react-native"
import { Text } from "@/components/ui/text"
import { NotAvailable } from "@/features/case/block-section"
import { NdviChart } from "@/features/case/blocks/field/ndvi-chart"
import { statuses } from "@/features/case/blocks/field-view"
import {
  formatShare,
  formatSigned,
  formatWhole,
} from "@/features/case/case-format"
import { CaseState } from "@/features/case/case-state"
import {
  CaseReferencesProvider,
  EvidenceDetails,
} from "@/features/case/evidence-chip"
import { useCaseBundle } from "@/features/case/use-case"
import { headerOptions } from "@/features/shell/header-options"

const missing = (value: number | null, format: (n: number) => string) =>
  value === null ? "Missing" : format(value)

export default function LotScreen() {
  const { zoneId, lotId } = useLocalSearchParams<{
    zoneId: string
    lotId: string
  }>()
  const bundle = useCaseBundle(zoneId)
  const field = bundle.status === "ready" ? bundle.data.field : null
  const lot = field?.lots.find((item) => item.field_id === lotId)
  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ ...headerOptions, title: lot?.name ?? lotId }} />
      {bundle.status !== "ready" ? (
        <CaseState status={bundle.status} />
      ) : !field || !lot ? (
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
              {formatWhole(lot.area_ha)} ha
              {lot.is_demo_farm && ` · part of ${field.farm_name}`}
            </Text>
            {lot.latest_crop !== null || lot.status !== null ? (
              <>
                <Text className="font-medium">
                  {lot.latest_crop ?? "No crop"} ·{" "}
                  {lot.latest_crop_source === "INTA"
                    ? "INTA map"
                    : "Team model"}{" "}
                  · Crop purity {missing(lot.crop_purity, formatShare)}
                </Text>
                <Text className="font-medium">
                  {lot.status ? statuses[lot.status] : "No status"} · latest
                  campaign, {lot.latest_campaign}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {lot.status_reason ?? "No reason recorded for this status."}
                </Text>
                <Text className="font-medium">Crop per campaign</Text>
                {lot.history.map((entry) => (
                  <Text key={entry.campaign} className="text-sm">
                    {entry.campaign} · {entry.crop ?? "Not classified"} ·{" "}
                    {entry.source === "INTA" ? "INTA map" : "Team model"}
                  </Text>
                ))}
                <Text className="font-medium">NDVI, September to May</Text>
                <NdviChart
                  months={field.ndvi_months}
                  lot={lot.ndvi_curve}
                  zone={lot.zone_ndvi_curve}
                />
                <Text className="text-xs text-muted-foreground">
                  This lot, {lot.latest_campaign} · Zone median for the same
                  crop
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {[
                    [
                      "Vigor gap vs zone",
                      missing(lot.vigor_gap, (n) => formatSigned(n, 2)),
                    ],
                    [
                      "Vigor (peak NDVI)",
                      missing(lot.vigor_ndvi, (n) => n.toFixed(2)),
                    ],
                    ["Crop purity", missing(lot.crop_purity, formatShare)],
                    ["Evenness", missing(lot.evenness, formatShare)],
                  ].map(([label, value]) => (
                    <View
                      key={label}
                      className="w-[48%] gap-1 rounded-lg border border-border p-3"
                    >
                      <Text className="text-xs text-muted-foreground">
                        {label}
                      </Text>
                      <Text className="text-lg font-light">{value}</Text>
                    </View>
                  ))}
                </View>
                <EvidenceDetails
                  meta={field.lots_meta}
                  horizon={`Campaign ${lot.latest_campaign}`}
                />
              </>
            ) : (
              <Text className="text-sm text-muted-foreground">
                This outline carries no crop, status or NDVI. It is on the map
                for context: the numbers exist only for the lots of{" "}
                {field.farm_name}.
              </Text>
            )}
          </ScrollView>
        </CaseReferencesProvider>
      )}
    </View>
  )
}
