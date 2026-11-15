import type { CaseIndex } from "@cropilot/api"
import { router } from "expo-router"
import { View } from "react-native"
import { ListRow, ListSection } from "@/components/list-row"
import { Text } from "@/components/ui/text"
import {
  ENSO_PHASE_LABEL,
  formatSigned,
  formatWetness,
  formatWetterThan,
} from "@/features/case/case-format"
import { EvidenceDetails } from "@/features/case/evidence-chip"
import { caseHref, zonesHref } from "@/features/case/routes"

export function NationalInfo({ index }: { index: CaseIndex }) {
  const start = `${index.campaign} starts with ONI ${formatSigned(index.oni_jas)}`
  return (
    <View className="gap-4">
      <Text>
        {index.oni_jas > index.highest_past_oni_jas
          ? `${start}, above every past campaign`
          : `${start}, a ${ENSO_PHASE_LABEL[index.enso_phase]} winter`}
      </Text>
      <Text>
        Oceanic Niño Index for July to September, as NOAA publishes it in early
        October: {ENSO_PHASE_LABEL[index.enso_phase]}. The highest before was{" "}
        {formatSigned(index.highest_past_oni_jas)} in{" "}
        {index.highest_past_oni_campaign}. Markers show how wet the soil was in
        each zone.
      </Text>
      <EvidenceDetails
        meta={index.meta}
        horizon="ONI July to September, soil wetness 22 to 31 August"
        sources={index.sources}
      />
    </View>
  )
}

export function NationalCampaign({
  index,
  zoneId,
  preview = false,
}: {
  index: CaseIndex
  zoneId: string
  preview?: boolean
}) {
  const zones = preview ? index.zones.slice(0, 3) : index.zones
  return (
    <View className="gap-2 px-4 py-4">
      <Text className="text-sm text-muted-foreground">
        Soil wetness, end of August · Index from 0 (dry) to 1 (saturated)
      </Text>
      <ListSection title="Across Argentina">
        {zones.map((zone) => (
          <ListRow
            key={zone.zone_id}
            title={zone.name}
            subtitle={`${zone.province} · ${zone.soil_wetness_end_aug !== null && zone.soil_wetness_percentile !== null ? `${formatWetness(zone.soil_wetness_end_aug)} · ${formatWetterThan(zone.soil_wetness_percentile)}` : "No soil wetness value"}${!preview && zone.analogs.length ? `\nYears like this: ${zone.analogs.slice(0, 3).join(", ")}${zone.analogs.length > 3 ? ` +${zone.analogs.length - 3}` : ""}` : ""}${!preview && ["water", "field"].filter((module) => (module === "water" ? zone.modules.water : zone.modules.field) === "not_available").length ? `\nNot available yet: ${(["water", "field"] as const).filter((module) => zone.modules[module] === "not_available").join(", ")}` : ""}`}
            right={
              zone.soil_wetness_percentile !== null ? (
                <View className="h-1.5 w-16 overflow-hidden rounded-full bg-border">
                  <View
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${zone.soil_wetness_percentile * 100}%` }}
                  />
                </View>
              ) : undefined
            }
            onPress={
              zone.modules.years_like_this === "available"
                ? () => router.push(caseHref(zone.zone_id))
                : undefined
            }
          />
        ))}
        {preview && (
          <ListRow
            title={`See all ${index.zones.length} zones`}
            onPress={() => router.push(zonesHref(zoneId))}
          />
        )}
      </ListSection>
    </View>
  )
}
