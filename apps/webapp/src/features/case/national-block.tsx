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
import { translate, useI18n } from "@/lib/i18n"

const LEGEND_STEPS = [0, 0.25, 0.5, 0.75, 1] as const

function headline(index: CaseIndex, sinceYear: number | undefined): string {
  const start = translate("{campaign} starts with ONI {oni}", undefined, {
    campaign: index.campaign,
    oni: formatSigned(index.oni_jas),
  })
  if (index.oni_jas > index.highest_past_oni_jas) {
    return sinceYear === undefined
      ? translate("{start}, above every past campaign", undefined, { start })
      : translate("{start}, above every campaign since {year}", undefined, {
          start,
          year: sinceYear,
        })
  }
  return translate("{start}, a {phase} winter", undefined, {
    start,
    phase: translate(ENSO_PHASE_LABEL[index.enso_phase]),
  })
}

function WetnessLegend() {
  const { t } = useI18n("case")

  return (
    <div className="flex flex-col gap-2 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">
        <Term term="Soil wetness">{t("Soil wetness")}</Term>
        {t(", end of August")}
      </span>
      <div className="flex items-center gap-2">
        <span>{t("Drier")}</span>
        <span aria-hidden className="flex gap-0.5">
          {LEGEND_STEPS.map((step) => (
            <span
              key={step}
              className="block size-4 rounded-full border border-background ring-1 ring-foreground/30"
              style={{ backgroundColor: accentScale(step) }}
            />
          ))}
        </span>
        <span>{t("Wetter than most past campaigns")}</span>
      </div>
      <span className="flex items-center gap-2">
        <ZoneDot percentile={null} className="size-4" />
        {t("No soil wetness value for this zone")}
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
  const { t } = useI18n("case")

  const missingModules = (["water", "field"] as const).filter(
    (module) => zone.modules[module] === "not_available"
  )
  return (
    <li>
      <Link
        to="/case/$zoneId"
        params={{ zoneId: zone.zone_id }}
        resetScroll={false}
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
            {t("No soil wetness value")}
          </span>
        )}
        {zone.analogs.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {t("Years like this: ")}
            {zone.analogs.slice(0, 3).join(", ")}
            {zone.analogs.length > 3 && ` +${zone.analogs.length - 3}`}
          </span>
        )}
        {missingModules.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {t("Not available yet: ")}
            {missingModules.map((module) => t(module)).join(", ")}
          </span>
        )}
      </Link>
    </li>
  )
}

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
  const { t } = useI18n("case")

  return (
    <CaseReferencesProvider sources={index.sources} glossary={glossary}>
      <BlockSection
        id={id}
        title={headline(index, sinceYear)}
        lead={
          <>
            <Term term="ONI">{t("Oceanic Niño Index")}</Term>
            {t(
              " for July to September, as NOAA publishes it in early October:"
            )}{" "}
            {t(ENSO_PHASE_LABEL[index.enso_phase])}
            {t(". The highest before was")}{" "}
            {formatSigned(index.highest_past_oni_jas)}
            {t(" in")} {index.highest_past_oni_campaign}
            {t(". Markers show how wet the soil was in each zone.")}
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
                horizon={t(
                  "ONI July to September, soil wetness 22 to 31 August"
                )}
              />
            </div>
          </div>
          {!isCompact && (
            <ul
              aria-label={t("Zones with a case")}
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
