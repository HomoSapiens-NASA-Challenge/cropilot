import type { CaseIndex, GlossaryTerm, ZoneCard } from "@cropilot/api"
import { Link } from "@tanstack/react-router"
import { cn } from "cn"
import { ArrowRight } from "lucide-react"
import { BlockSection } from "@/features/case/block-frame"
import { CaseReferencesProvider } from "@/features/case/case-context"
import {
  ENSO_PHASE_LABEL,
  formatSigned,
  formatWetness,
  formatWetterThan,
} from "@/features/case/case-format"
import { EvidenceChip } from "@/features/case/evidence-chip"
import { Term } from "@/features/case/glossary-term"
import { NationalMap, ZoneDot } from "@/features/case/national-map"
import { accentScale } from "@/lib/data-colors"

const LEGEND_STEPS = [0, 0.25, 0.5, 0.75, 1] as const

function headline(index: CaseIndex, sinceYear: number | undefined): string {
  const start = `${index.campaign} starts with ONI ${formatSigned(index.oni_jas)}`
  if (index.oni_jas > index.highest_past_oni_jas) {
    return sinceYear === undefined
      ? `${start}, above every past campaign`
      : `${start}, above every campaign since ${sinceYear}`
  }
  return `${start}, a ${ENSO_PHASE_LABEL[index.enso_phase]} winter`
}

function WetnessLegend() {
  return (
    <div className="flex flex-col gap-2 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">
        <Term term="Soil wetness">Soil wetness</Term>, end of August
      </span>
      <div className="flex items-center gap-2">
        <span>Drier</span>
        <span aria-hidden className="flex gap-0.5">
          {LEGEND_STEPS.map((step) => (
            <span
              key={step}
              className="block size-4 rounded-full border border-background ring-1 ring-foreground/30"
              style={{ backgroundColor: accentScale(step) }}
            />
          ))}
        </span>
        <span>Wetter than most past campaigns</span>
      </div>
      <span className="flex items-center gap-2">
        <ZoneDot percentile={null} className="size-4" />
        No soil wetness value for this zone
      </span>
    </div>
  )
}

function ZoneRow({
  zone,
  isSelected,
}: {
  zone: ZoneCard
  isSelected: boolean
}) {
  const missingModules = (["water", "field"] as const).filter(
    (module) => zone.modules[module] === "not_available"
  )
  return (
    <li>
      <Link
        to="/case/$zoneId"
        params={{ zoneId: zone.zone_id }}
        className={cn(
          "group/zone flex flex-col gap-2 rounded-lg border px-3 py-2.5 outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
          isSelected && "border-primary bg-primary/5 hover:bg-primary/5"
        )}
      >
        <span className="flex items-baseline justify-between gap-3">
          <span className="font-medium">{zone.name}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {zone.province}
            <ArrowRight className="size-3 text-primary opacity-0 transition-opacity group-hover/zone:opacity-100" />
          </span>
        </span>
        {zone.soil_wetness_end_aug !== null &&
        zone.soil_wetness_percentile !== null ? (
          <>
            <span
              aria-hidden
              className="block h-1.5 w-full overflow-hidden rounded-full bg-border"
            >
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${zone.soil_wetness_percentile * 100}%`,
                  backgroundColor: accentScale(zone.soil_wetness_percentile),
                }}
              />
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatWetness(zone.soil_wetness_end_aug)} ·{" "}
              {formatWetterThan(zone.soil_wetness_percentile)}
            </span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">
            No soil wetness value
          </span>
        )}
        {zone.analogs.length > 0 && (
          <span className="text-xs text-muted-foreground">
            Years like this: {zone.analogs.slice(0, 3).join(", ")}
            {zone.analogs.length > 3 && ` +${zone.analogs.length - 3}`}
          </span>
        )}
        {missingModules.length > 0 && (
          <span className="text-xs text-muted-foreground">
            Not available yet: {missingModules.join(", ")}
          </span>
        )}
      </Link>
    </li>
  )
}

/**
 * B0. How the campaign starts in every zone with a case: the headline, a map of
 * Argentina with one marker per zone, and the same zones as a list.
 */
export function NationalBlock({
  index,
  glossary,
  sinceYear,
  selectedZoneId,
  isCompact = false,
  id,
}: {
  index: CaseIndex
  /** Terms for the "What is this?" hints. The index carries none of its own. */
  glossary?: ReadonlyArray<GlossaryTerm>
  /** First campaign of the record, to say "above every campaign since 1981". */
  sinceYear?: number
  selectedZoneId?: string
  /** A shorter map and no list, for the overview of the app. */
  isCompact?: boolean
  id?: string
}) {
  return (
    <CaseReferencesProvider sources={index.sources} glossary={glossary}>
      <BlockSection
        id={id}
        title={headline(index, sinceYear)}
        lead={
          <>
            <Term term="ONI">Oceanic Niño Index</Term> for July to September,
            known at the end of August: {ENSO_PHASE_LABEL[index.enso_phase]}.
            The highest before was {formatSigned(index.highest_past_oni_jas)} in{" "}
            {index.highest_past_oni_campaign}. Markers show how wet the soil was
            in each zone.
          </>
        }
      >
        <div
          className={cn("grid gap-4", !isCompact && "lg:grid-cols-[1fr_22rem]")}
        >
          <div className="flex min-w-0 flex-col gap-3">
            <NationalMap
              zones={index.zones}
              selectedZoneId={selectedZoneId}
              className={isCompact ? "h-72 md:h-80" : undefined}
            />
            <div className="flex flex-wrap items-start justify-between gap-3">
              <WetnessLegend />
              <EvidenceChip
                meta={index.meta}
                horizon="ONI July to September, soil wetness 22 to 31 August"
              />
            </div>
          </div>
          {!isCompact && (
            <ul
              aria-label="Zones with a case"
              className="flex max-h-136 flex-col gap-2 overflow-y-auto pr-1"
            >
              {index.zones.map((zone) => (
                <ZoneRow
                  key={zone.zone_id}
                  zone={zone}
                  isSelected={zone.zone_id === selectedZoneId}
                />
              ))}
            </ul>
          )}
        </div>
      </BlockSection>
    </CaseReferencesProvider>
  )
}
