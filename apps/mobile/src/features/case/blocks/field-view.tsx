import type { CaseBundle } from "@cropilot/api"
import { useRouter } from "expo-router"
import { useState } from "react"
import { View } from "react-native"
import Svg, { Circle, Rect } from "react-native-svg"
import { ListRow, ListSection } from "@/components/list-row"
import { Text } from "@/components/ui/text"
import { NotAvailable } from "@/features/case/block-section"
import { FieldMap } from "@/features/case/blocks/field/map"
import { pluralize } from "@/features/case/case-format"
import { EvidenceChip } from "@/features/case/evidence-chip"
import { footprintHref, lotHref } from "@/features/case/routes"
import { CROPS, cropOf, LOT_STATUS, LOT_STATUS_IDS } from "@/lib/data-colors"
import { SVG_COLORS } from "@/lib/theme"

export const statuses = {
  ok: "OK",
  watch: "Watch",
  alert: "Alert",
  check: "Check",
  bare: "Bare",
} as const

type Field = NonNullable<CaseBundle["field"]>

export function FieldInfo({ bundle }: { bundle: CaseBundle }) {
  const field = bundle.field
  if (!field) return null
  const withData = field.lots.filter(
    (lot) => lot.latest_crop !== null || lot.status !== null
  )
  return (
    <View className="gap-4">
      <Text>
        {pluralize(withData.length, "lot")} of {field.farm_name} carry a crop, a
        status and an NDVI curve, and {field.lots.length - withData.length} more
        outlines of {bundle.zone_name} give context. All come from satellite
        imagery. Every crop says whether it comes from an INTA map or from the
        team's model.
      </Text>
      <Text>
        {field.farm_name_is_made_up
          ? "The name is invented. The outlines, crops and NDVI are satellite estimates."
          : "Outlines, crops and NDVI are satellite estimates."}
      </Text>
      <Text>
        Select a lot on the map or in the list to see its crops, NDVI and
        status. These are the lots of {field.farm_name}.
      </Text>
      {field.lots.length > withData.length && (
        <Text>
          {field.lots.length - withData.length} more outlines of the zone are on
          the map for context. They carry no crop, status or NDVI.
        </Text>
      )}
      {field.limitations.length > 0 && (
        <Text className="font-medium">Limits of the field view</Text>
      )}
      {field.limitations.map((limit) => (
        <Text key={limit}>{limit}</Text>
      ))}
    </View>
  )
}

function Legend({ field }: { field: Field }) {
  const lots = field.lots.filter(
    (lot) => lot.latest_crop !== null || lot.status !== null
  )
  const crops = [...new Set(lots.map((lot) => cropOf(lot.latest_crop)))]
  return (
    <View className="gap-1 px-4">
      <Text className="text-xs font-medium">Fill: latest crop</Text>
      <View className="flex-row flex-wrap gap-x-3 gap-y-1">
        {crops.map((crop) => (
          <View key={crop} className="flex-row items-center gap-1">
            <Svg width={12} height={12}>
              <Rect width={12} height={12} fill={CROPS[crop].color} />
            </Svg>
            <Text className="text-xs text-muted-foreground">
              {CROPS[crop].label}
            </Text>
          </View>
        ))}
        {lots.length < field.lots.length && (
          <View className="flex-row items-center gap-1">
            <Svg width={12} height={12}>
              <Rect
                x={1}
                y={1}
                width={10}
                height={10}
                fill={SVG_COLORS.accent}
                stroke={SVG_COLORS.mutedForeground}
              />
            </Svg>
            <Text className="text-xs text-muted-foreground">
              Faint outline: no data, context only
            </Text>
          </View>
        )}
      </View>
      <Text className="text-xs font-medium">Outline: status</Text>
      <View className="flex-row flex-wrap gap-x-3 gap-y-1">
        {LOT_STATUS_IDS.map((status) => (
          <View key={status} className="flex-row items-center gap-1">
            <Svg width={12} height={12}>
              <Circle
                cx={6}
                cy={6}
                r={4}
                fill={SVG_COLORS.background}
                stroke={LOT_STATUS[status].color}
                strokeWidth={2}
              />
            </Svg>
            <Text className="text-xs text-muted-foreground">
              {LOT_STATUS[status].label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export function FieldView({
  bundle,
  zoneId = bundle.zone_id,
}: {
  bundle: CaseBundle
  zoneId?: string
}) {
  const router = useRouter()
  const [showAll, setShowAll] = useState(false)
  const field = bundle.field
  if (bundle.modules.field === "not_available" || !field)
    return (
      <View className="p-4">
        <NotAvailable description="Lots and the reference footprint are mapped for Pergamino only." />
      </View>
    )
  const lots = field.lots.filter((lot) => lot.is_demo_farm)
  return (
    <View className="gap-3 py-4">
      <View className="flex-row items-center gap-2 px-4">
        <Text className="text-lg font-medium">{field.farm_name}</Text>
        {field.farm_name_is_made_up && (
          <Text className="rounded-full border border-border px-2 py-1 text-xs">
            Made-up name
          </Text>
        )}
      </View>
      <FieldMap
        field={field}
        onSelect={(id) => router.push(lotHref(zoneId, id))}
      />
      <Legend field={field} />
      <View className="px-4">
        <EvidenceChip meta={field.lots_meta} />
      </View>
      <View className="px-4">
        <ListSection>
          {lots.slice(0, showAll ? lots.length : 5).map((lot) => (
            <ListRow
              key={lot.field_id}
              title={`${lot.name} · ${lot.latest_crop ?? "No crop"}`}
              right={
                <Text className="text-xs text-muted-foreground">
                  {lot.status ? statuses[lot.status] : "No status"}
                </Text>
              }
              onPress={() => router.push(lotHref(zoneId, lot.field_id))}
            />
          ))}
          {lots.length > 5 && (
            <ListRow
              title={
                showAll ? "Show fewer lots" : `Show all ${lots.length} lots`
              }
              onPress={() => setShowAll(!showAll)}
            />
          )}
          {field.reference_field && (
            <ListRow
              title={`Reference footprint ${field.reference_field.field_id}`}
              onPress={() => router.push(footprintHref(zoneId))}
            />
          )}
        </ListSection>
      </View>
    </View>
  )
}
