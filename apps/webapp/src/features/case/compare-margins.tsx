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

/**
 * Margin rows: a dot strip per strategy, who leads in each analog campaign, and the
 * worst analog campaign. One toggle switches all of them between gross and after rent.
 */
export function MarginRows({
  compare,
  kind,
  onKindChange,
}: {
  compare: Compare
  kind: MarginKind
  onKindChange: (kind: MarginKind) => void
}) {
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
        <span className="text-sm font-medium">Margin shown</span>
        <SegmentedControl
          label="Margin shown"
          value={kind}
          options={MARGIN_KIND_OPTIONS}
          onChange={onKindChange}
        />
        <span className="text-sm text-muted-foreground">
          One toggle for the three rows below.
        </span>
      </div>

      <ComparisonRow
        title={`Margin in each analog campaign (${MARGIN_KIND_NAME[kind]})`}
        description={`One dot per analog campaign, ${ranked.length} per strategy, on the same axis. Hover or focus a dot for its campaign.`}
        evidence={<EvidenceChip meta={meta} horizon={MARGIN_HORIZON} />}
      >
        <StrategyGrid>
          {strategies.map((strategy) => {
            const dots: StripDot[] = ranked.map((analog) => {
              const value = marginFor(analog, strategy.strategy_id, kind)
              return {
                key: analog.scenario_id,
                value,
                description: `${analog.campaign} (analog ${analog.analog_rank}): ${value === null ? "no margin" : formatUsdPerHa(value)}`,
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
              Assumptions behind these margins
            </summary>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
              {compare.margin_assumptions.map((assumption) => (
                <li key={assumption}>{assumption}</li>
              ))}
            </ul>
          </details>
        )}
      </ComparisonRow>

      <ComparisonRow
        title="Who leads in each analog campaign"
        description="No strategy wins everywhere. The dot marks the highest margin of that campaign."
        evidence={<EvidenceChip meta={meta} horizon={MARGIN_HORIZON} />}
      >
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                {strategies.map((strategy) => (
                  <TableHead
                    key={strategy.strategy_id}
                    className="min-w-28 text-right text-xs whitespace-normal"
                  >
                    {strategy.label}
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
                        analog {analog.analog_rank}
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
                                Leads this campaign:{" "}
                              </span>
                            </>
                          )}
                          {value === null ? "Missing" : formatWhole(value)}
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
          USD per hectare, {MARGIN_KIND_NAME[kind]}.
        </p>
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            <span className="font-medium">
              Order flips in {flipped.length} of {pairs.length} pairs.
            </span>{" "}
            <span className="text-muted-foreground">
              In a flipped pair, each strategy leads the other in some of the
              analog campaigns.
            </span>
          </p>
          {flipped.length > 0 && (
            <details className="text-sm">
              <summary className="w-fit cursor-pointer rounded-lg text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
                See the flipped pairs
              </summary>
              <ul className="mt-2 flex flex-col gap-2">
                {flipped.map((pair) => (
                  <li
                    key={`${pair.strategy_a}-${pair.strategy_b}`}
                    className="rounded-lg border px-3 py-2"
                  >
                    <p className="font-medium">
                      {strategyLabel(strategies, pair.strategy_a)} vs{" "}
                      {strategyLabel(strategies, pair.strategy_b)}
                    </p>
                    <p className="text-muted-foreground">
                      First ahead in {pair.a_ahead_in.join(", ")}. Second ahead
                      in {pair.b_ahead_in.join(", ")}.
                    </p>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </ComparisonRow>

      <ComparisonRow
        title="Worst analog campaign"
        description={`The lowest ${MARGIN_KIND_NAME[kind]} of the ${ranked.length} analog campaigns, for each strategy.`}
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
                      in {worst.campaign}, lowest of{" "}
                      {pluralize(entries.length, "campaign")}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    No margin in any analog campaign.
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

/** Planted but not harvested area, by crop and by the phase known at the end of August. */
export function UnharvestedRow({ compare }: { compare: Compare }) {
  const { unharvested, unharvested_meta: meta } = compare
  return (
    <ComparisonRow
      title="Planted but not harvested"
      description="Share of the planted area that was never harvested, by the ENSO phase known at the end of August. It is an area loss, not a yield."
      evidence={
        <EvidenceChip meta={meta} horizon="Each campaign of the phase" />
      }
    >
      {unharvested.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rows for this zone.</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Crop</TableHead>
                <TableHead>Phase</TableHead>
                <TableHead className="text-right">Campaigns</TableHead>
                <TableHead className="text-right">Mean</TableHead>
                <TableHead className="text-right">Worst</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unharvested.map((row) => (
                <TableRow key={`${row.crop}-${row.enso_phase}`}>
                  <TableCell className="font-medium">{row.crop}</TableCell>
                  <TableCell>{ENSO_PHASE_LABEL[row.enso_phase]}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.campaigns}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.mean_pct === null
                      ? "Missing"
                      : `${row.mean_pct.toFixed(1)}%`}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.max_pct === null
                      ? "Missing"
                      : `${row.max_pct.toFixed(1)}%${row.max_campaign ? ` in ${row.max_campaign}` : ""}`}
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
  return value === null ? "Missing" : formatUsdPerHa(value)
}

function share(value: number | null): string {
  return value === null ? "Missing" : formatShare(value)
}

/** Secondary ensemble statistics. Collapsed: the samples are small and none is a headline. */
export function RiskSummary({ compare }: { compare: Compare }) {
  const { risk_summary: rows, strategies, margins_meta: meta } = compare
  if (rows.length === 0) return null

  return (
    <Collapsible>
      <Panel className="flex flex-col gap-3">
        <CollapsibleTrigger className="group/risk flex w-full items-center justify-between gap-3 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <span className="flex flex-col gap-0.5">
            <span className="font-medium">Secondary: risk summary</span>
            <span className="text-sm text-muted-foreground">
              Small samples, never the headline. Open it to see n and the note.
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 transition-transform group-data-panel-open/risk:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col gap-3">
          <p className="max-w-3xl text-sm text-muted-foreground">
            {compare.risk_note}
          </p>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Strategy</TableHead>
                  <TableHead className="text-right">n</TableHead>
                  <TableHead className="text-right">p10</TableHead>
                  <TableHead className="text-right">Median</TableHead>
                  <TableHead className="text-right">p90</TableHead>
                  <TableHead className="text-right">Worst 10% mean</TableHead>
                  <TableHead className="text-right">Below rent</TableHead>
                  <TableHead className="text-right">Below zero</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.strategy_id}>
                    <TableCell className="font-medium whitespace-normal">
                      {strategyLabel(strategies, row.strategy_id)}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums whitespace-normal">
                      {row.n_scenarios} scenarios
                      <br />
                      <span className="text-muted-foreground">
                        {row.n_yield_campaigns} yield, {row.n_price_campaigns}{" "}
                        price campaigns
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
              horizon="Ensemble of yield and price campaigns"
            />
            <Badge variant="outline">Secondary statistic</Badge>
          </div>
        </CollapsibleContent>
      </Panel>
    </Collapsible>
  )
}
