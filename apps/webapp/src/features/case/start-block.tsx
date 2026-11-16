import type { CaseBundle } from "@cropilot/api"
import { TriangleAlert } from "lucide-react"
import { BlockSection, Callout, Panel, Stat } from "@/features/case/block-frame"
import { CaseReferencesProvider } from "@/features/case/case-context"
import {
  ENSO_PHASE_LABEL,
  formatSigned,
  formatWetness,
  formatWetterThan,
  SCALE_LABEL,
} from "@/features/case/case-format"
import { EvidenceChip } from "@/features/case/evidence-chip"
import { Term } from "@/features/case/glossary-term"
import { useI18n } from "@/lib/i18n"

/**
 * B1. How the campaign starts in this zone: the two signals known at the end of
 * August, the decision they inform and the scale they describe.
 */
export function StartBlock({
  bundle,
  id,
}: {
  bundle: CaseBundle
  id?: string
}) {
  const { t } = useI18n("case")

  const { current, signals } = bundle.years_like_this
  const { decision } = bundle

  return (
    <CaseReferencesProvider sources={bundle.sources} glossary={bundle.glossary}>
      <BlockSection
        id={id}
        title={t("{value1}: how {value2} starts", {
          value1: bundle.zone_name,
          value2: current.campaign,
        })}
        lead={t(
          "{value1}, {value2}. Two signals decide which past campaigns look like this one: El Niño in July to September (NOAA publishes it in early October) and soil wetness at the end of August.",
          { value1: bundle.zone_name, value2: bundle.province }
        )}
      >
        {current.outside_historical_range && (
          <Callout
            icon={TriangleAlert}
            title={t("Outside the historical range")}
          >
            <p>
              <Term term="ONI">{t("ONI")}</Term> {formatSigned(current.oni_jas)}
              {t(" is above every campaign on record. The highest before was")}{" "}
              {formatSigned(current.highest_past_oni_jas)}
              {t(" in")} {current.highest_past_oni_campaign}
              {t(
                ". No past campaign started this strong: the years below are the closest, not equals."
              )}
            </p>
          </Callout>
        )}
        <Panel className="grid gap-8 md:grid-cols-3">
          <Stat
            label={
              <>
                <Term term="ONI">{t("ONI")}</Term>
                {t(" July to September")}
              </>
            }
            value={formatSigned(current.oni_jas)}
            detail={t("{phase}. Highest before: {oni} in {campaign}.", {
              phase: t(ENSO_PHASE_LABEL[current.enso_phase]),
              oni: formatSigned(current.highest_past_oni_jas),
              campaign: current.highest_past_oni_campaign,
            })}
            evidence={
              <EvidenceChip
                meta={signals}
                scaleLabel={SCALE_LABEL.global}
                horizon={t("July to September of the decision year")}
              />
            }
          />
          <Stat
            label={
              <>
                <Term term="Soil wetness">{t("Soil wetness")}</Term>
                {t(", end of August")}
              </>
            }
            value={formatWetness(current.soil_wetness_end_aug)}
            detail={t("{wetness}. Index from 0 (dry) to 1 (saturated).", {
              wetness: formatWetterThan(current.soil_wetness_percentile),
            })}
            evidence={
              <EvidenceChip meta={signals} horizon={t("22 to 31 August")} />
            }
          />
          <Stat
            label={t("The decision")}
            value={
              <span className="text-2xl/9">
                {t("Summer crop, end of August")}
              </span>
            }
            detail={t(decision.description)}
          />
        </Panel>
        {signals.note && (
          <p className="max-w-3xl text-sm text-muted-foreground">
            {t(signals.note)}
          </p>
        )}
      </BlockSection>
    </CaseReferencesProvider>
  )
}
