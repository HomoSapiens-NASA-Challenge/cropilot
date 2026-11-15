import type { CaseBundle } from "@cropilot/api"
import { useRouter } from "expo-router"
import { useState } from "react"
import { Pressable, View } from "react-native"
import { ListRow, ListSection } from "@/components/list-row"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Sheet } from "@/components/ui/sheet"
import { Text } from "@/components/ui/text"
import { DotStrip, stripDomain } from "@/features/case/blocks/compare/dot-strip"
import {
  ENSO_PHASE_LABEL,
  formatUsdPerHa,
  pluralize,
} from "@/features/case/case-format"
import { EvidenceChip, EvidenceDetails } from "@/features/case/evidence-chip"
import { leadersHref, strategyHref, waterHref } from "@/features/case/routes"

export function StrategyCompare({
  bundle,
  zoneId = bundle.zone_id,
}: {
  bundle: CaseBundle
  zoneId?: string
}) {
  const { compare } = bundle
  const router = useRouter()
  const [kind, setKind] = useState<"gross" | "after_rent">("gross")
  const [open, setOpen] = useState(false)
  const margin = (
    id: string,
    analog: CaseBundle["compare"]["analog_margins"][number]
  ) => {
    const item = analog.margins.find((entry) => entry.strategy_id === id)
    return item
      ? kind === "gross"
        ? item.gross_margin_usd_ha
        : item.gross_margin_after_rent_usd_ha
      : null
  }
  const domain = stripDomain(
    compare.analog_margins.flatMap((analog) =>
      compare.strategies.map((strategy) => margin(strategy.strategy_id, analog))
    )
  )
  return (
    <View className="gap-2 px-4 py-3">
      <Text className="font-medium">No strategy wins everywhere.</Text>
      {bundle.modules.margins === "available" ? (
        <>
          <SegmentedControl
            value={kind}
            onChange={setKind}
            options={[
              { value: "gross", label: "Gross margin" },
              { value: "after_rent", label: "After rent" },
            ]}
          />
          <EvidenceChip
            meta={compare.margins_meta}
            horizon="One campaign, in each of the analog campaigns"
          />
          {domain && (
            <View className="flex-row justify-between">
              <Text className="text-xs text-muted-foreground">
                {formatUsdPerHa(domain[0])}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {formatUsdPerHa(domain[1])}
              </Text>
            </View>
          )}
          {compare.strategies.map((strategy) => {
            const entries = compare.analog_margins.flatMap((analog) => {
              const value = margin(strategy.strategy_id, analog)
              return value === null
                ? []
                : [{ value, campaign: analog.campaign }]
            })
            const worst = entries.reduce<(typeof entries)[number] | null>(
              (a, b) => (!a || b.value < a.value ? b : a),
              null
            )
            return (
              <View
                key={strategy.strategy_id}
                className="border-b border-border py-1"
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push(strategyHref(zoneId, strategy.strategy_id))
                  }
                  className="min-h-11 flex-row items-center justify-between gap-2"
                >
                  <Text className="flex-1 font-medium">{strategy.label}</Text>
                  {strategy.is_current && (
                    <Text className="text-xs text-primary">
                      Now · to confirm
                    </Text>
                  )}
                  <Text className="text-muted-foreground">›</Text>
                </Pressable>
                <DotStrip
                  compact
                  domain={domain}
                  format={formatUsdPerHa}
                  dots={compare.analog_margins.map((analog) => {
                    const value = margin(strategy.strategy_id, analog)
                    return {
                      key: analog.scenario_id,
                      value,
                      description: `${analog.campaign} (analog ${analog.analog_rank}): ${value === null ? "no margin" : formatUsdPerHa(value)}`,
                    }
                  })}
                />
                <Text className="text-xs text-muted-foreground">
                  {worst
                    ? `${formatUsdPerHa(worst.value)} in ${worst.campaign}, lowest of ${pluralize(entries.length, "campaign")}`
                    : "No margin in any analog campaign."}
                </Text>
              </View>
            )
          })}
          <ListRow
            title="Who leads in each analog campaign"
            onPress={() => router.push(leadersHref(zoneId))}
          />
          <ListRow
            title="Planted but not harvested"
            onPress={() => setOpen(true)}
          />
        </>
      ) : (
        <Text>Margins by analog campaign need market data for this zone.</Text>
      )}
      <ListRow
        title="Water: unmet crop water on the field footprint"
        subtitle={
          compare.water && bundle.modules.water === "available"
            ? undefined
            : "Not computed"
        }
        onPress={
          compare.water && bundle.modules.water === "available"
            ? () => router.push(waterHref(zoneId))
            : undefined
        }
      />
      <ListSection title="Not computed">
        <View className="flex-row flex-wrap gap-1 pt-1">
          {compare.not_computed.map((item) => (
            <Text
              key={item.metric}
              className="rounded-lg border border-dashed border-border px-2 py-1 text-xs text-muted-foreground"
            >
              {item.metric}
            </Text>
          ))}
        </View>
      </ListSection>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Planted but not harvested"
      >
        <Text>
          Share of the planted area that was never harvested, by the El Niño
          phase of July to September. It is an area loss, not a yield.
        </Text>
        <EvidenceDetails
          meta={compare.unharvested_meta}
          horizon="Each campaign of the phase"
        />
        {compare.unharvested.length ? (
          compare.unharvested.map((row) => (
            <View
              key={`${row.crop}-${row.enso_phase}`}
              className="gap-1 border-b border-border pb-3"
            >
              <Text className="font-medium">
                {row.crop} · {ENSO_PHASE_LABEL[row.enso_phase]}
              </Text>
              <Text>
                Campaigns: {row.campaigns} · Mean:{" "}
                {row.mean_pct === null
                  ? "Missing"
                  : `${row.mean_pct.toFixed(1)}%`}
              </Text>
              <Text>
                Worst:{" "}
                {row.max_pct === null
                  ? "Missing"
                  : `${row.max_pct.toFixed(1)}%${row.max_campaign ? ` in ${row.max_campaign}` : ""}`}
              </Text>
            </View>
          ))
        ) : (
          <Text>No rows for this zone.</Text>
        )}
      </Sheet>
    </View>
  )
}
