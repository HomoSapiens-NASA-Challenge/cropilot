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
  const { current, signals } = bundle.years_like_this
  const { decision } = bundle

  return (
    <CaseReferencesProvider sources={bundle.sources} glossary={bundle.glossary}>
      <BlockSection
        id={id}
        title={`${bundle.zone_name}: how ${current.campaign} starts`}
        lead={`${bundle.zone_name}, ${bundle.province}. Two signals known at the end of August decide which past campaigns look like this one.`}
      >
        {current.outside_historical_range && (
          <Callout icon={TriangleAlert} title="Outside the historical range">
            <p>
              <Term term="ONI">ONI</Term> {formatSigned(current.oni_jas)} is
              above every campaign on record. The highest before was{" "}
              {formatSigned(current.highest_past_oni_jas)} in{" "}
              {current.highest_past_oni_campaign}. No past campaign started this
              strong: the years below are the closest, not equals.
            </p>
          </Callout>
        )}
        <Panel className="grid gap-8 md:grid-cols-3">
          <Stat
            label={
              <>
                <Term term="ONI">ONI</Term> July to September
              </>
            }
            value={formatSigned(current.oni_jas)}
            detail={`${ENSO_PHASE_LABEL[current.enso_phase]}. Highest before: ${formatSigned(current.highest_past_oni_jas)} in ${current.highest_past_oni_campaign}.`}
            evidence={
              <EvidenceChip
                meta={signals}
                scaleLabel={SCALE_LABEL.global}
                horizon="July to September of the decision year"
              />
            }
          />
          <Stat
            label={
              <>
                <Term term="Soil wetness">Soil wetness</Term>, end of August
              </>
            }
            value={formatWetness(current.soil_wetness_end_aug)}
            detail={`${formatWetterThan(current.soil_wetness_percentile)}. Index from 0 (dry) to 1 (saturated).`}
            evidence={<EvidenceChip meta={signals} horizon="22 to 31 August" />}
          />
          <Stat
            label="The decision"
            value={
              <span className="text-2xl/9">Summer crop, end of August</span>
            }
            detail={decision.description}
          />
        </Panel>
        {signals.note && (
          <p className="max-w-3xl text-sm text-muted-foreground">
            {signals.note}
          </p>
        )}
      </BlockSection>
    </CaseReferencesProvider>
  )
}
