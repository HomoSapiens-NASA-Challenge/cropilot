import type { CaseBundle } from "@cropilot/api"
import { router } from "expo-router"
import { TriangleAlert } from "lucide-react-native"
import { View } from "react-native"
import { ListRow, ListSection } from "@/components/list-row"
import { Text } from "@/components/ui/text"
import { Callout, Panel } from "@/features/case/block-section"
import {
  ENSO_PHASE_LABEL,
  formatSigned,
  formatWetness,
  formatWetterThan,
  SCALE_LABEL,
} from "@/features/case/case-format"
import { EvidenceChip, EvidenceDetails } from "@/features/case/evidence-chip"
import { zonesHref } from "@/features/case/routes"

export function StartInfo({ bundle }: { bundle: CaseBundle }) {
  const { current, signals } = bundle.years_like_this
  return (
    <View className="gap-4">
      <Text>
        {bundle.zone_name}: how {current.campaign} starts
      </Text>
      <Text>
        {bundle.zone_name}, {bundle.province}. Two signals decide which past
        campaigns look like this one: El Niño in July to September (NOAA
        publishes it in early October) and soil wetness at the end of August.
      </Text>
      <Text>
        ONI July to September · Highest before:{" "}
        {formatSigned(current.highest_past_oni_jas)} in{" "}
        {current.highest_past_oni_campaign}.
      </Text>
      <Text>The decision · Summer crop, end of August</Text>
      <Text>{bundle.decision.description}</Text>
      {signals.note && <Text>{signals.note}</Text>}
      <EvidenceDetails
        meta={signals}
        scaleLabel={SCALE_LABEL.global}
        horizon="July to September of the decision year"
      />
      <EvidenceDetails meta={signals} horizon="22 to 31 August" />
    </View>
  )
}

export function CampaignStart({
  bundle,
  zoneId,
  showZones = true,
}: {
  bundle: CaseBundle
  zoneId: string
  showZones?: boolean
}) {
  const { current, signals } = bundle.years_like_this
  return (
    <View className="gap-4 px-4 py-4">
      {current.outside_historical_range && (
        <Callout icon={TriangleAlert} title="Outside the historical range">
          <Text className="text-muted-foreground">
            ONI {formatSigned(current.oni_jas)} is above every campaign on
            record. The highest before was{" "}
            {formatSigned(current.highest_past_oni_jas)} in{" "}
            {current.highest_past_oni_campaign}. No past campaign started this
            strong: the years below are the closest, not equals.
          </Text>
        </Callout>
      )}
      <Panel className="gap-4">
        <View className="gap-1">
          <Text className="text-sm text-muted-foreground">
            ONI July to September · °C anomaly · {SCALE_LABEL.global}
          </Text>
          <Text className="text-2xl font-light">
            {formatSigned(current.oni_jas)} ·{" "}
            {ENSO_PHASE_LABEL[current.enso_phase]}
          </Text>
        </View>
        <View className="gap-1">
          <Text className="text-sm text-muted-foreground">
            Soil wetness, end of August · {SCALE_LABEL[signals.scale]}
          </Text>
          <Text className="text-2xl font-light">
            {formatWetness(current.soil_wetness_end_aug)}
          </Text>
          <Text className="text-sm text-muted-foreground">
            {formatWetterThan(current.soil_wetness_percentile)}. Index from 0
            (dry) to 1 (saturated).
          </Text>
        </View>
        <EvidenceChip
          meta={signals}
          horizon="ONI July to September, soil wetness 22 to 31 August"
        />
      </Panel>
      {showZones && (
        <ListSection>
          <ListRow
            title="Across Argentina"
            onPress={() => router.push(zonesHref(zoneId))}
          />
        </ListSection>
      )}
    </View>
  )
}
