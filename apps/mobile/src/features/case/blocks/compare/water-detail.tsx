import type { CaseBundle } from "@cropilot/api"
import { type ReactNode, useState } from "react"
import { Pressable, View } from "react-native"
import { Text } from "@/components/ui/text"
import { NotAvailable, NotComputedRow } from "@/features/case/block-section"
import { DotStrip, stripDomain } from "@/features/case/blocks/compare/dot-strip"
import {
  campaignName,
  formatMm,
  formatShare,
  formatSigned,
} from "@/features/case/case-format"
import { EvidenceDetails } from "@/features/case/evidence-chip"

function Section({
  title,
  description,
  evidence,
  children,
}: {
  title: string
  description?: string
  evidence?: ReactNode
  children: ReactNode
}) {
  return (
    <View className="gap-3 border-t border-border pt-5">
      <Text className="text-xl font-light tracking-tight">{title}</Text>
      {description && (
        <Text className="text-sm text-muted-foreground">{description}</Text>
      )}
      {evidence}
      {children}
    </View>
  )
}
function Expand({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <View className="gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        className="min-h-11 justify-center"
      >
        <Text className="font-medium">
          {title} {open ? "−" : "+"}
        </Text>
      </Pressable>
      {open && children}
    </View>
  )
}
function Choices<T extends number | string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: ReadonlyArray<{ value: T; label: string; disabled?: boolean }>
  onChange: (value: T) => void
}) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => (
          <Pressable
            key={String(option.value)}
            accessibilityRole="button"
            accessibilityState={{
              selected: value === option.value,
              disabled: option.disabled,
            }}
            disabled={option.disabled}
            onPress={() => onChange(option.value)}
            className={`min-h-11 justify-center rounded-lg border px-3 ${value === option.value ? "border-primary bg-primary/10" : "border-border"} ${option.disabled ? "opacity-40" : ""}`}
          >
            <Text className="text-sm">{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}
export function WaterDetail({ bundle }: { bundle: CaseBundle }) {
  const { compare } = bundle
  const [depth, setDepth] = useState(compare.water?.default_depth_m ?? 0)
  const [fraction, setFraction] = useState(
    compare.water?.default_initial_water_fraction ?? 0
  )
  const [shift, setShift] = useState(0)
  const water = compare.water
  const matches = (entry: {
    depth_m: number
    initial_water_fraction: number
    summer_shift_days: number
  }) =>
    entry.depth_m === depth &&
    entry.initial_water_fraction === fraction &&
    entry.summer_shift_days === shift
  const waterDomain = water
    ? stripDomain([
        0,
        ...water.episodes
          .filter((episode) => episode.scenario_id !== null && matches(episode))
          .map((episode) => episode.crop_demand_unmet_fraction),
      ])
    : null
  return (
    <View className="gap-4 px-4 py-4">
      <Section
        title="Water: unmet crop water on the field footprint"
        evidence={
          water && bundle.modules.water === "available" ? (
            <EvidenceDetails
              meta={water.meta}
              scaleLabel={`Footprint ${water.field_id}`}
              horizon="Three continuous campaigns from June of the start year"
            />
          ) : null
        }
      >
        {water && bundle.modules.water === "available" ? (
          <>
            <Choices
              label="Starting point: soil depth"
              value={depth}
              options={[
                ...new Map(
                  water.starting_points.map((p) => [p.depth_m, p.capacity_mm])
                ),
              ]
                .sort(([a], [b]) => a - b)
                .map(([value, capacity]) => ({
                  value,
                  label: `${value} m · ${Math.round(capacity)} mm`,
                }))}
              onChange={(value) => {
                setDepth(value)
                setShift(0)
              }}
            />
            <Choices
              label="Starting point: initial water"
              value={fraction}
              options={[
                ...new Set(
                  water.starting_points.map((p) => p.initial_water_fraction)
                ),
              ]
                .sort((a, b) => a - b)
                .map((value) => ({ value, label: formatShare(value) }))}
              onChange={(value) => {
                setFraction(value)
                setShift(0)
              }}
            />
            <Choices
              label="Sowing date: summer crops shifted by"
              value={shift}
              options={[...water.summer_shift_days]
                .sort((a, b) => a - b)
                .map((value) => ({
                  value,
                  label:
                    value === 0
                      ? "Default date"
                      : `${value > 0 ? "+" : "-"}${Math.abs(value)} days`,
                  disabled: !water.episodes.some(
                    (e) =>
                      e.depth_m === depth &&
                      e.initial_water_fraction === fraction &&
                      e.summer_shift_days === value
                  ),
                }))}
              onChange={setShift}
            />
            {compare.strategies.map((strategy) => {
              const episodes = water.episodes.filter(
                (e) =>
                  e.strategy_id === strategy.strategy_id &&
                  e.scenario_id !== null &&
                  matches(e)
              )
              const counts = (
                shift === 0 ? water.robustness : water.calendar_effects
              ).find(
                (entry) =>
                  entry.strategy_id === strategy.strategy_id && matches(entry)
              )
              return (
                <View
                  key={strategy.strategy_id}
                  className="gap-2 rounded-lg border border-border p-3"
                >
                  <Text className="font-medium">{strategy.label}</Text>
                  {strategy.water_strategy_id === null ? (
                    <NotComputedRow
                      title="Water"
                      reason="Cropilot has no water simulation for this rotation."
                    />
                  ) : (
                    <>
                      {strategy.water_match === "closest" && (
                        <Text className="text-sm text-muted-foreground">
                          Closest match: same crops, a different phase of the
                          cycle.
                        </Text>
                      )}
                      <Text className="text-sm font-medium">
                        Unmet crop water, analog episodes
                      </Text>
                      {episodes.length ? (
                        <DotStrip
                          domain={waterDomain}
                          format={formatShare}
                          dots={episodes.map((e) => ({
                            key: e.run_id,
                            value: e.crop_demand_unmet_fraction,
                            description: `${campaignName(e.start_year)}: ${formatShare(e.crop_demand_unmet_fraction)} of crop water unmet, ${formatMm(e.crop_et_deficit_mm)}`,
                          }))}
                        />
                      ) : (
                        <Text className="text-sm text-muted-foreground">
                          No run for these settings.
                        </Text>
                      )}
                      <Text className="text-sm font-medium">
                        {shift
                          ? "Against the default sowing date, all episodes"
                          : "Against the current rotation, all episodes"}
                      </Text>
                      {strategy.is_current && !shift ? (
                        <Text className="text-sm text-muted-foreground">
                          This is the reference: every episode equals itself.
                        </Text>
                      ) : counts ? (
                        <>
                          <View className="h-2 flex-row overflow-hidden rounded-lg bg-muted">
                            <View
                              className="bg-primary"
                              style={{ flex: counts.lower_count }}
                            />
                            <View
                              className="bg-muted-foreground"
                              style={{ flex: counts.equal_count }}
                            />
                            <View
                              className="bg-border"
                              style={{ flex: counts.higher_count }}
                            />
                          </View>
                          <Text className="text-sm">
                            Less unmet water in {counts.lower_count} · same in{" "}
                            {counts.equal_count} · more in {counts.higher_count}{" "}
                            of {counts.count} episodes
                          </Text>
                          <Text className="text-xs text-muted-foreground">
                            Difference in unmet crop water: median{" "}
                            {formatSigned(counts.median_mm, 0)} mm, from{" "}
                            {formatSigned(counts.minimum_mm, 0)} to{" "}
                            {formatSigned(counts.maximum_mm, 0)} mm.
                          </Text>
                        </>
                      ) : (
                        <Text className="text-sm text-muted-foreground">
                          No paired runs for these settings.
                        </Text>
                      )}
                    </>
                  )}
                </View>
              )
            })}
            <Expand title="Limits of the water runs">
              {water.limitations.map((item) => (
                <Text key={item} className="text-sm text-muted-foreground">
                  {item}
                </Text>
              ))}
            </Expand>
          </>
        ) : (
          <NotAvailable description="The water runs exist for the Pergamino reference footprint only." />
        )}
      </Section>
    </View>
  )
}
