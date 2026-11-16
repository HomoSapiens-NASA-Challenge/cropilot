import type { CaseBundle } from "@cropilot/api"
import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import type { ReactNode } from "react"
import { BlockSection, Panel } from "@/features/case/block-frame"
import { CaseReferencesProvider } from "@/features/case/case-context"
import {
  ENSO_PHASE_LABEL,
  type EnsoPhase,
  formatDecimal,
  formatSigned,
  formatWhole,
  SCALE_LABEL,
} from "@/features/case/case-format"
import {
  areaFinding,
  fieldFinding,
  leaderFinding,
  rentFinding,
  sowingFinding,
} from "@/features/case/case-highlights"
import { strategyLabel } from "@/features/case/compare-layout"
import { EvidenceChip } from "@/features/case/evidence-chip"
import { useI18n } from "@/lib/i18n"

type FindingProps = {
  title: string
  figure: string
  children: ReactNode
  evidence: ReactNode
  zoneId: string
  /** The block of the page that holds the detail behind the figure. */
  detail: { hash: string; label: string }
}

/** One finding: what it says, the figure, the sentence that reads it, and where it comes from. */
function Finding({
  title,
  figure,
  children,
  evidence,
  zoneId,
  detail,
}: FindingProps) {
  return (
    <Panel className="flex flex-col gap-3">
      <h3 className="font-medium">{title}</h3>
      <p className="text-4xl font-light tracking-tight tabular-nums">
        {figure}
      </p>
      <p className="text-sm text-muted-foreground">{children}</p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
        {evidence}
        <Link
          to="/case/$zoneId"
          params={{ zoneId }}
          hash={detail.hash}
          className="inline-flex items-center gap-1 rounded-lg text-sm font-medium text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {detail.label}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </Panel>
  )
}

/**
 * What an agronomist could miss in this case, before any chart: the facts of the
 * bundle that bear on the decision, each with its source and a way to its detail.
 * Cropilot picks no rotation here either.
 */
export function HighlightsBlock({
  bundle,
  id,
}: {
  bundle: CaseBundle
  id?: string
}) {
  const { t } = useI18n("case")

  const { compare, years_like_this: years, zone_id: zoneId } = bundle
  const { current } = years
  const leaders = leaderFinding(compare)
  const rent = rentFinding(compare)
  const sowing = sowingFinding(compare)
  const area = areaFinding(bundle)
  const fields = bundle.field ? fieldFinding(bundle.field.lots) : null

  const hasFindings =
    current.outside_historical_range ||
    leaders !== null ||
    rent !== null ||
    sowing !== null ||
    area !== null ||
    fields !== null
  if (!hasFindings) return null

  const analogHorizon = t("One campaign, in each of the analog campaigns")
  const marginsLink = { hash: "compare", label: t("See the margins") }

  /** "Strong El Niño" reads "strong El Niño" in the middle of an English sentence. */
  const phaseInSentence = (phase: EnsoPhase) =>
    t(ENSO_PHASE_LABEL[phase]).replace(/^Strong/, "strong")
  const percent = (value: number) => formatDecimal(value, 1)
  const countOf = (count: number, total: number) =>
    t("{value1} of {value2}", {
      value1: formatWhole(count),
      value2: formatWhole(total),
    })
  const range = (from: number, to: number) =>
    from === to ? String(from) : t("{from} to {to}", { from, to })

  return (
    <CaseReferencesProvider sources={bundle.sources} glossary={bundle.glossary}>
      <BlockSection
        id={id}
        title={t("What you might miss this campaign")}
        lead={t(
          "Facts from the record of {zone} that bear on the {campaign} decision. Each one names its source and links to its detail. None of them picks a rotation.",
          { zone: bundle.zone_name, campaign: current.campaign }
        )}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {current.outside_historical_range && (
            <Finding
              title={t("No past campaign started this strong")}
              figure={formatSigned(current.oni_jas)}
              zoneId={zoneId}
              detail={{ hash: "start", label: t("See the start") }}
              evidence={
                <EvidenceChip
                  meta={years.signals}
                  scaleLabel={SCALE_LABEL.global}
                  horizon={t("July to September of the decision year")}
                />
              }
            >
              {t(
                "ONI of July to September. The highest before was {oni} in {campaign}, so the years like this one are the closest on record, not equals.",
                {
                  oni: formatSigned(current.highest_past_oni_jas),
                  campaign: current.highest_past_oni_campaign,
                }
              )}
            </Finding>
          )}

          {leaders &&
            (leaders.leaderIds.length > 1 ? (
              <Finding
                title={t("No rotation wins every time")}
                figure={t("{count} rotations", {
                  count: leaders.leaderIds.length,
                })}
                zoneId={zoneId}
                detail={marginsLink}
                evidence={
                  <EvidenceChip
                    meta={compare.margins_meta}
                    horizon={analogHorizon}
                  />
                }
              >
                {t(
                  "That many different rotations had the highest gross margin in the {campaigns} analog campaigns.",
                  { campaigns: leaders.campaigns }
                )}
                {leaders.pairs > 0 &&
                  t(
                    " {swaps} of {pairs} pairs of rotations swap order from one campaign to another.",
                    { swaps: leaders.pairsThatSwap, pairs: leaders.pairs }
                  )}
              </Finding>
            ) : (
              <Finding
                title={t("One rotation leads, on margin alone")}
                figure={countOf(leaders.campaigns, leaders.campaigns)}
                zoneId={zoneId}
                detail={marginsLink}
                evidence={
                  <EvidenceChip
                    meta={compare.margins_meta}
                    horizon={analogHorizon}
                  />
                }
              >
                {t(
                  "{rotation} had the highest gross margin in every analog campaign. The margin compares single campaigns: what repeating a crop does to soil, weeds and diseases is not in it.",
                  {
                    rotation: leaders.leaderIds
                      .map((leaderId) =>
                        strategyLabel(compare.strategies, leaderId)
                      )
                      .join(", "),
                  }
                )}
              </Finding>
            ))}

          {rent && (
            <Finding
              title={t("Rent takes the margin")}
              figure={countOf(rent.belowRent, rent.campaigns)}
              zoneId={zoneId}
              detail={{ hash: "compare", label: t("See after rent") }}
              evidence={
                <EvidenceChip
                  meta={compare.margins_meta}
                  horizon={analogHorizon}
                />
              }
            >
              {rent.currentStrategyId
                ? t(
                    "Analog campaigns in which {rotation}, the rotation taken as current, ended below rent.",
                    {
                      rotation: strategyLabel(
                        compare.strategies,
                        rent.currentStrategyId
                      ),
                    }
                  )
                : t("Analog campaigns in which no rotation covered rent.")}
              {rent.currentStrategyId &&
                rent.noneCovered.length > 0 &&
                t(" In {count} of them no rotation covered it: {campaigns}.", {
                  count: rent.noneCovered.length,
                  campaigns: rent.noneCovered.join(", "),
                })}
              {t(
                " Rent is today's regional value, applied to each past campaign."
              )}
            </Finding>
          )}

          {sowing && compare.water && (
            <Finding
              title={t("Sowing date moves water stress")}
              figure={
                sowing.fewestLower === sowing.mostLower
                  ? countOf(sowing.mostLower, sowing.episodes)
                  : t("{fewest} to {most} of {episodes}", {
                      fewest: sowing.fewestLower,
                      most: sowing.mostLower,
                      episodes: sowing.episodes,
                    })
              }
              zoneId={zoneId}
              detail={{ hash: "compare", label: t("See the water runs") }}
              evidence={
                <EvidenceChip
                  meta={compare.water.meta}
                  scaleLabel={t("Footprint {value1}", {
                    value1: compare.water.field_id,
                  })}
                  horizon={t(
                    "Three continuous campaigns from June of the start year"
                  )}
                />
              }
            >
              {t(
                "Historical episodes in which sowing the summer crops {days} days later lowered unmet crop water, in each of the {rotations} rotations simulated: a median of {reduction} mm less. A scenario on one footprint, not validated in the field.",
                {
                  days: sowing.shiftDays,
                  rotations: sowing.rotations,
                  reduction: range(
                    Math.round(sowing.smallestMedianMm),
                    Math.round(sowing.largestMedianMm)
                  ),
                }
              )}
            </Finding>
          )}

          {area && (
            <Finding
              title={t("Most area lost under {phase}", {
                phase: phaseInSentence(area.worst.enso_phase),
              })}
              figure={`${percent(area.worst.max_pct ?? area.worst.mean_pct)}%`}
              zoneId={zoneId}
              detail={{ hash: "compare", label: t("See by phase") }}
              evidence={
                <EvidenceChip
                  meta={compare.unharvested_meta}
                  horizon={t("Each campaign of the phase")}
                />
              }
            >
              {area.worst.max_pct !== null && area.worst.max_campaign
                ? t(
                    "Share of the soybean area planted in {campaign} that was not harvested.",
                    { campaign: area.worst.max_campaign }
                  )
                : t(
                    "Mean share of the soybean area planted that was not harvested."
                  )}
              {area.current
                ? t(
                    " The {count} {phase} campaigns average {mean}%, against {currentMean}% in the {currentCount} {currentPhase} campaigns on record.",
                    {
                      count: area.worst.campaigns,
                      phase: phaseInSentence(area.worst.enso_phase),
                      mean: percent(area.worst.mean_pct),
                      currentMean: percent(area.current.mean_pct),
                      currentCount: area.current.campaigns,
                      currentPhase: phaseInSentence(area.current.enso_phase),
                    }
                  )
                : t(
                    " The {count} {phase} campaigns average {mean}%, the highest of any phase.",
                    {
                      count: area.worst.campaigns,
                      phase: phaseInSentence(area.worst.enso_phase),
                      mean: percent(area.worst.mean_pct),
                    }
                  )}
              {t(" It is an area loss; the source does not give its cause.")}
            </Finding>
          )}

          {fields && bundle.field && (
            <Finding
              title={t("Fields below their neighbours")}
              figure={countOf(fields.below, fields.read)}
              zoneId={zoneId}
              detail={{ hash: "field", label: t("See the map") }}
              evidence={
                <EvidenceChip
                  meta={bundle.field.lots_meta}
                  scaleLabel={t("Each field of the zone")}
                />
              }
            >
              {t(
                "Fields read in {campaign} whose peak greenness is under that of the zone's fields with the same crop.",
                { campaign: fields.campaign }
              )}
              {fields.toCheck > 0 &&
                t(
                  " {count} more need a look: no zone reference or no recognised summer crop.",
                  { count: formatWhole(fields.toCheck) }
                )}
              {t(" Greenness is not yield.")}
            </Finding>
          )}
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {t(
            "These come from the record and from scenarios, not from a forecast."
          )}{" "}
          {t(years.backtest.text)}{" "}
          <Link
            to="/case/$zoneId"
            params={{ zoneId }}
            hash="method"
            className="rounded-lg font-medium text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {t("Method and limits")}
          </Link>
        </p>
      </BlockSection>
    </CaseReferencesProvider>
  )
}
