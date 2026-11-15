import type { CampaignNote, CaseBundle } from "@cropilot/api"
import { useRouter } from "expo-router"
import { useState } from "react"
import { View } from "react-native"
import Svg, { Circle } from "react-native-svg"
import { ListRow, ListSection } from "@/components/list-row"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Text } from "@/components/ui/text"
import { BlockSection, NotAvailable } from "@/features/case/block-section"
import {
  YearsScatter,
  YIELD_CROP_LABEL,
  type YieldCrop,
  yieldOf,
} from "@/features/case/blocks/years/scatter"
import {
  ENSO_PHASE_LABEL,
  formatPercentSigned,
  formatSigned,
  pluralize,
} from "@/features/case/case-format"
import { EvidenceDetails } from "@/features/case/evidence-chip"
import { campaignHref } from "@/features/case/routes"
import { SVG_COLORS } from "@/lib/theme"

export const NOTE_KIND_LABEL = {
  worst_on_record: "Worst on record",
  june_dry_soil_alert: "June dry-soil alert",
  counterexample: "Counterexample",
  dated_event: "Dated event",
  strongest_start: "Strongest start",
} as const satisfies Record<CampaignNote["kind"], string>

export function YearsInfo({ bundle }: { bundle: CaseBundle }) {
  const { campaigns, current, method, signals, yields, backtest } =
    bundle.years_like_this
  const analogs = campaigns.filter((point) => point.is_analog)
  const missingWetness = campaigns.filter(
    (point) => point.soil_wetness_end_aug === null
  )
  return (
    <View className="gap-4">
      <Text>
        Every past campaign at {bundle.zone_name}, placed by El Niño in July to
        September and soil wetness at the end of August. The{" "}
        {pluralize(analogs.length, "analog")} closest to {current.campaign} are
        ringed and ranked.
      </Text>
      {missingWetness.length > 0 && (
        <Text>
          Not on the plot, no soil wetness value:{" "}
          {missingWetness.map((point) => point.campaign).join(", ")}.
        </Text>
      )}
      <EvidenceDetails
        meta={signals}
        horizon="ONI July to September, soil wetness 22 to 31 August"
      />
      <EvidenceDetails
        meta={yields}
        horizon="One campaign, anomaly against the trend"
      />
      <Text className="font-medium">Method</Text>
      {[
        ["Analogs (k)", String(method.k)],
        ["Features", method.features.join(", ")],
        ["Distance", method.distance],
        ["Candidates", method.candidates],
        ["Phase rule", method.phase_rule],
      ].map(([label, value]) => (
        <View key={label}>
          <Text className="text-sm text-muted-foreground">{label}</Text>
          <Text className="text-sm">{value}</Text>
        </View>
      ))}
      <Text className="font-medium">A measured limit of this method</Text>
      <Text>{backtest.text}</Text>
      <EvidenceDetails sourceIds={backtest.source_ids} />
      <Text className="font-medium">Campaign notes</Text>
      {campaigns.flatMap((point) =>
        point.notes.map((note) => (
          <View key={`${point.campaign}-${note.kind}`} className="gap-2">
            <Text className="font-medium">
              {point.campaign} · {NOTE_KIND_LABEL[note.kind]}
            </Text>
            <Text>{note.text}</Text>
            <EvidenceDetails sourceIds={note.source_ids} />
          </View>
        ))
      )}
    </View>
  )
}

export function YearsLikeThis({
  bundle,
  zoneId = bundle.zone_id,
}: {
  bundle: CaseBundle
  zoneId?: string
}) {
  const [crop, setCrop] = useState<YieldCrop>("soybean")
  const router = useRouter()
  const { campaigns, current, method } = bundle.years_like_this
  if (bundle.modules.years_like_this === "not_available")
    return (
      <BlockSection title="Years like this">
        <NotAvailable />
      </BlockSection>
    )
  // "Closest first": the list follows the analog rank, not the calendar.
  const analogs = campaigns
    .filter((point) => point.is_analog)
    .sort(
      (a, b) =>
        (a.analog_rank ?? Number.POSITIVE_INFINITY) -
        (b.analog_rank ?? Number.POSITIVE_INFINITY)
    )
  const withYield = campaigns.filter(
    (point) => yieldOf(point, crop).anomalyPct !== null
  )
  const modeledCount = withYield.filter(
    (point) => yieldOf(point, crop).provenance === "modeled"
  ).length
  const limit = Math.max(
    10,
    Math.ceil(
      Math.max(
        0,
        ...withYield.map((point) =>
          Math.abs(yieldOf(point, crop).anomalyPct ?? 0)
        )
      ) / 10
    ) * 10
  )
  return (
    <View className="gap-3 px-4 py-4">
      <Text className="text-sm text-muted-foreground">
        Crop for the yield color
      </Text>
      <SegmentedControl
        value={crop}
        onChange={setCrop}
        options={[
          { value: "soybean", label: YIELD_CROP_LABEL.soybean },
          { value: "maize", label: YIELD_CROP_LABEL.maize },
        ]}
      />
      <YearsScatter
        zoneId={zoneId}
        campaigns={campaigns}
        current={current}
        crop={crop}
        limit={limit}
      />
      <Text className="text-sm">
        n = {campaigns.length}{" "}
        <Text className="text-muted-foreground">
          campaigns, {analogs.length} analogs (k = {method.k}).{" "}
          {YIELD_CROP_LABEL[crop]} yield is known for {withYield.length}
          {modeledCount > 0 ? `, ${modeledCount} of them modeled` : ""}.
        </Text>
      </Text>
      {current.outside_historical_range && (
        <Text className="text-sm text-muted-foreground">
          {current.campaign} sits outside the cloud: its ONI of{" "}
          {formatSigned(current.oni_jas)} is higher than every past campaign, so
          there is no dot near it.
        </Text>
      )}
      <View className="gap-1">
        <Svg width={104} height={16}>
          {[0.9, 0.65, 0.4].map((opacity, index) => (
            <Circle
              key={`loss-${opacity}`}
              cx={8 + index * 14}
              cy={8}
              r={5}
              fill={SVG_COLORS.foreground}
              fillOpacity={opacity}
            />
          ))}
          {[0.4, 0.65, 0.9].map((opacity, index) => (
            <Circle
              key={`gain-${opacity}`}
              cx={56 + index * 14}
              cy={8}
              r={5}
              fill={SVG_COLORS.primary}
              fillOpacity={opacity}
            />
          ))}
        </Svg>
        <Text className="text-xs text-muted-foreground">
          {formatPercentSigned(-limit)} or lower · {formatPercentSigned(limit)}{" "}
          or higher · yield vs trend
        </Text>
        <Text className="text-xs text-muted-foreground">
          Hollow: yield modeled · No yield value · Analog · Campaign note
        </Text>
      </View>
      <ListSection
        title={`The ${pluralize(analogs.length, "analog")}, closest first`}
      >
        {analogs.map((point) => (
          <ListRow
            key={point.campaign}
            title={`${point.analog_rank} · ${point.campaign}`}
            subtitle={`${ENSO_PHASE_LABEL[point.enso_phase]} · ONI ${formatSigned(point.oni_jas)} · Distance: ${point.analog_distance === null ? "Missing" : point.analog_distance.toFixed(2)}`}
            onPress={() => router.push(campaignHref(zoneId, point.campaign))}
          />
        ))}
      </ListSection>
    </View>
  )
}
