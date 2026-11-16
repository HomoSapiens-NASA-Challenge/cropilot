import type { AnalogMargins, Compare, StrategyMargin } from "@cropilot/api"
import { cn } from "cn"
import { ChevronDown } from "lucide-react"
import { SegmentedControl } from "@/components/segmented-control"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Panel } from "@/features/case/block-frame"
import {
  ENSO_PHASE_LABEL,
  formatDecimal,
  formatShare,
  formatUsdPerHa,
  formatWhole,
  pluralize,
} from "@/features/case/case-format"
import {
  ComparisonRow,
  StrategyCell,
  StrategyGrid,
  strategyLabel,
} from "@/features/case/compare-layout"
import { DotStrip, type StripDot, stripDomain } from "@/features/case/dot-strip"
import { EvidenceChip } from "@/features/case/evidence-chip"
import { translate, useI18n } from "@/lib/i18n"

export type MarginKind = "gross" | "after_rent"

const MARGIN_KIND_OPTIONS = [
  { value: "gross", label: "Gross margin" },
  { value: "after_rent", label: "After rent" },
] as const

const MARGIN_KIND_NAME = {
  gross: "gross margin",
  after_rent: "gross margin after rent",
} as const satisfies Record<MarginKind, string>

const RANKING_METRIC = {
  gross: "gross_margin",
  after_rent: "gross_margin_after_rent",
} as const satisfies Record<MarginKind, string>

const MARGIN_HORIZON = "One campaign, in each of the analog campaigns"

function marginOf(margin: StrategyMargin, kind: MarginKind): number | null {
  return kind === "gross"
    ? margin.gross_margin_usd_ha
    : margin.gross_margin_after_rent_usd_ha
}

function marginFor(
  analog: AnalogMargins,
  strategyId: string,
  kind: MarginKind
): number | null {
  const margin = analog.margins.find(
    (entry) => entry.strategy_id === strategyId
  )
  return margin ? marginOf(margin, kind) : null
}

/** Strategies with the highest margin of a campaign. More than one only on an exact tie. */
function leadersOf(analog: AnalogMargins, kind: MarginKind): string[] {
  const values = analog.margins.flatMap((margin) => {
    const value = marginOf(margin, kind)
    return value === null ? [] : [{ id: margin.strategy_id, value }]
  })
  const best = Math.max(...values.map((entry) => entry.value))
  return values.filter((entry) => entry.value === best).map((entry) => entry.id)
}

export function MarginRows({
  compare,
  kind,
  onKindChange,
}: {
  compare: Compare
  kind: MarginKind
  onKindChange: (kind: MarginKind) => void
}) {
  const { t } = useI18n("case")

  const { strategies, analog_margins: analogs, margins_meta: meta } = compare
  const ranked = [...analogs].sort((a, b) => a.analog_rank - b.analog_rank)
  const domain = stripDomain(
    ranked.flatMap((analog) =>
      strategies.map((strategy) =>
        marginFor(analog, strategy.strategy_id, kind)
      )
    )
  )
  const pairs = compare.ranking_changes.filter(
    (change) => change.metric === RANKING_METRIC[kind]
  )
  const flipped = pairs.filter((pair) => pair.order_inverts)

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">{t("Margin shown")}</span>
        <SegmentedControl
          label={t("Margin shown")}
          value={kind}
          options={MARGIN_KIND_OPTIONS}
          onChange={onKindChange}
        />
        <span className="text-sm text-muted-foreground">
          {t("One toggle for the three rows below.")}
        </span>
      </div>

      <ComparisonRow
        title={t("Margin in each analog campaign ({value1})", {
          value1: t(MARGIN_KIND_NAME[kind]),
        })}
        description={t(
          "One dot per analog campaign, {value1} per strategy, on the same axis. Hover or focus a dot for its campaign.",
          { value1: ranked.length }
        )}
        evidence={<EvidenceChip meta={meta} horizon={MARGIN_HORIZON} />}
      >
        <StrategyGrid>
          {strategies.map((strategy) => {
            const dots: StripDot[] = ranked.map((analog) => {
              const value = marginFor(analog, strategy.strategy_id, kind)
              return {
                key: analog.scenario_id,
                value,
                description: t("{campaign} (analog {rank}): {margin}", {
                  campaign: analog.campaign,
                  rank: analog.analog_rank,
                  margin:
                    value === null ? t("no margin") : formatUsdPerHa(value),
                }),
              }
            })
            return (
              <StrategyCell key={strategy.strategy_id} strategy={strategy}>
                <DotStrip dots={dots} domain={domain} format={formatUsdPerHa} />
              </StrategyCell>
            )
          })}
        </StrategyGrid>
        {compare.margin_assumptions.length > 0 && (
          <details className="group text-sm">
            <summary className="w-fit cursor-pointer rounded-lg text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
              {t("Assumptions behind these margins")}
            </summary>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
              {compare.margin_assumptions.map((assumption) => (
                <li key={assumption}>{t(assumption)}</li>
              ))}
            </ul>
          </details>
        )}
      </ComparisonRow>

      <ComparisonRow
        title={t("Who leads in each analog campaign")}
        description={t(
          "No strategy wins everywhere. The dot marks the highest margin of that campaign."
        )}
        evidence={<EvidenceChip meta={meta} horizon={MARGIN_HORIZON} />}
      >
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Campaign")}</TableHead>
                {strategies.map((strategy) => (
                  <TableHead
                    key={strategy.strategy_id}
                    className="min-w-28 text-right text-xs whitespace-normal"
                  >
                    {t(strategy.label)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranked.map((analog) => {
                const leaders = leadersOf(analog, kind)
                return (
                  <TableRow key={analog.scenario_id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {analog.campaign}
                      <span className="ml-2 hidden text-xs font-normal text-muted-foreground sm:inline">
                        {t("analog {value1}", { value1: analog.analog_rank })}
                      </span>
                    </TableCell>
                    {strategies.map((strategy) => {
                      const value = marginFor(
                        analog,
                        strategy.strategy_id,
                        kind
                      )
                      const isLeader = leaders.includes(strategy.strategy_id)
                      return (
                        <TableCell
                          key={strategy.strategy_id}
                          className={cn(
                            "text-right tabular-nums",
                            isLeader && "bg-primary/10 font-medium text-primary"
                          )}
                        >
                          {isLeader && (
                            <>
                              <span
                                aria-hidden
                                className="mr-1.5 inline-block size-1.5 rounded-full bg-primary align-middle"
                              />
                              <span className="sr-only">
                                {t("Leads this campaign: ")}
                              </span>
                            </>
                          )}
                          {value === null ? t("Missing") : formatWhole(value)}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("USD per hectare, ")}
          {t(MARGIN_KIND_NAME[kind])}.
        </p>
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            <span className="font-medium">
              {t("Order flips in {value1} of {value2} pairs.", {
                value1: flipped.length,
                value2: pairs.length,
              })}
            </span>{" "}
            <span className="text-muted-foreground">
              {t(
                "In a flipped pair, each strategy leads the other in some of the analog campaigns."
              )}
            </span>
          </p>
          {flipped.length > 0 && (
            <details className="text-sm">
              <summary className="w-fit cursor-pointer rounded-lg text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
                {t("See the flipped pairs")}
              </summary>
              <ul className="mt-2 flex flex-col gap-2">
                {flipped.map((pair) => (
                  <li
                    key={`${pair.strategy_a}-${pair.strategy_b}`}
                    className="rounded-lg border px-3 py-2"
                  >
                    <p className="font-medium">
                      {t("{value1} vs {value2}", {
                        value1: strategyLabel(strategies, pair.strategy_a),
                        value2: strategyLabel(strategies, pair.strategy_b),
                      })}
                    </p>
                    <p className="text-muted-foreground">
                      {t("First ahead in ")}
                      {pair.a_ahead_in.join(", ")}
                      {t(". Second ahead in ")}
                      {pair.b_ahead_in.join(", ")}.
                    </p>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </ComparisonRow>

      <ComparisonRow
        title={t("Worst analog campaign")}
        description={t(
          "The lowest {value1} of the {value2} analog campaigns, for each strategy.",
          { value1: t(MARGIN_KIND_NAME[kind]), value2: ranked.length }
        )}
        evidence={<EvidenceChip meta={meta} horizon={MARGIN_HORIZON} />}
      >
        <StrategyGrid>
          {strategies.map((strategy) => {
            const entries = ranked.flatMap((analog) => {
              const value = marginFor(analog, strategy.strategy_id, kind)
              return value === null
                ? []
                : [{ campaign: analog.campaign, value }]
            })
            const worst = entries.reduce<(typeof entries)[number] | null>(
              (lowest, entry) =>
                lowest === null || entry.value < lowest.value ? entry : lowest,
              null
            )
            return (
              <StrategyCell key={strategy.strategy_id} strategy={strategy}>
                {worst ? (
                  <>
                    <span className="text-2xl font-light tracking-tight tabular-nums">
                      {formatUsdPerHa(worst.value)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {t("in {value1}, lowest of {value2}", {
                        value1: worst.campaign,
                        value2: pluralize(entries.length, "campaign"),
                      })}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {t("No margin in any analog campaign.")}
                  </span>
                )}
              </StrategyCell>
            )
          })}
        </StrategyGrid>
      </ComparisonRow>
    </>
  )
}

/** Planted but not harvested area, by crop and by the July-to-September ENSO phase. */
export function UnharvestedRow({ compare }: { compare: Compare }) {
  const { t } = useI18n("case")

  const { unharvested, unharvested_meta: meta } = compare
  return (
    <ComparisonRow
      title={t("Planted but not harvested")}
      description={t(
        "Share of the planted area that was never harvested, by the El Niño phase of July to September. It is an area loss, not a yield."
      )}
      evidence={
        <EvidenceChip meta={meta} horizon={t("Each campaign of the phase")} />
      }
    >
      {unharvested.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("No rows for this zone.")}
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Crop")}</TableHead>
                <TableHead>{t("Phase")}</TableHead>
                <TableHead className="text-right">{t("Campaigns")}</TableHead>
                <TableHead className="text-right">{t("Mean")}</TableHead>
                <TableHead className="text-right">{t("Worst")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unharvested.map((row) => (
                <TableRow key={`${row.crop}-${row.enso_phase}`}>
                  <TableCell className="font-medium">{t(row.crop)}</TableCell>
                  <TableCell>{t(ENSO_PHASE_LABEL[row.enso_phase])}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.campaigns}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.mean_pct === null
                      ? t("Missing")
                      : t("{value1}%", {
                          value1: formatDecimal(row.mean_pct, 1),
                        })}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.max_pct === null
                      ? t("Missing")
                      : t("{value1}%{value2}", {
                          value1: formatDecimal(row.max_pct, 1),
                          value2: row.max_campaign
                            ? t(" in {value1}", { value1: row.max_campaign })
                            : "",
                        })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </ComparisonRow>
  )
}

function usd(value: number | null): string {
  return value === null ? translate("Missing") : formatUsdPerHa(value)
}

function share(value: number | null): string {
  return value === null ? translate("Missing") : formatShare(value)
}

/** Secondary ensemble statistics. Collapsed: the samples are small and none is a headline. */
export function RiskSummary({ compare }: { compare: Compare }) {
  const { t } = useI18n("case")

  const { risk_summary: rows, strategies, margins_meta: meta } = compare
  if (rows.length === 0) return null

  return (
    <Collapsible>
      <Panel className="flex flex-col gap-3">
        <CollapsibleTrigger className="group/risk flex w-full items-center justify-between gap-3 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <span className="flex flex-col gap-0.5">
            <span className="font-medium">{t("Secondary: risk summary")}</span>
            <span className="text-sm text-muted-foreground">
              {t(
                "Small samples, never the headline. Open it to see n and the note."
              )}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 transition-transform group-data-panel-open/risk:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col gap-3">
          <p className="max-w-3xl text-sm text-muted-foreground">
            {t(compare.risk_note)}
          </p>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Strategy")}</TableHead>
                  <TableHead className="text-right">{t("n")}</TableHead>
                  <TableHead className="text-right">{t("p10")}</TableHead>
                  <TableHead className="text-right">{t("Median")}</TableHead>
                  <TableHead className="text-right">{t("p90")}</TableHead>
                  <TableHead className="text-right">
                    {t("Worst 10% mean")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("Below rent")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("Below zero")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.strategy_id}>
                    <TableCell className="font-medium whitespace-normal">
                      {strategyLabel(strategies, row.strategy_id)}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums whitespace-normal">
                      {row.n_scenarios}
                      {t(" scenarios")}
                      <br />
                      <span className="text-muted-foreground">
                        {t("{value1} yield, {value2} price campaigns", {
                          value1: row.n_yield_campaigns,
                          value2: row.n_price_campaigns,
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {usd(row.p10_usd_ha)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {usd(row.p50_usd_ha)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {usd(row.p90_usd_ha)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {usd(row.cvar10_usd_ha)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {share(row.share_below_rent)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {share(row.share_below_zero)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <EvidenceChip
              meta={meta}
              horizon={t("Ensemble of yield and price campaigns")}
            />
            <Badge variant="outline">{t("Secondary statistic")}</Badge>
          </div>
        </CollapsibleContent>
      </Panel>
    </Collapsible>
  )
}
