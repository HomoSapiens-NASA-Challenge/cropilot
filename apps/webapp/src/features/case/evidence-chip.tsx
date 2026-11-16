import type { BlockMeta, SourceRef } from "@cropilot/api"
import { cn } from "cn"
import { ChevronDown, ExternalLink } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  useEvidenceSources,
  useSourceInputs,
} from "@/features/case/case-context"
import {
  PROVENANCE,
  type Provenance,
  SCALE_LABEL,
} from "@/features/case/case-format"
import {
  isCalculationReference,
  originalInputIds,
} from "@/features/case/source-lineage"
import { useI18n } from "@/lib/i18n"

type EvidenceMeta = Pick<
  BlockMeta,
  "provenance" | "scale" | "source_ids" | "note" | "unit"
>

type EvidenceChipProps = (
  | { meta: EvidenceMeta; sourceIds?: never }
  | { sourceIds: ReadonlyArray<string>; meta?: never }
) & {
  /** Replaces the scale of the bundle when the row is narrower, for example "Footprint 268949". */
  scaleLabel?: string
  /** What span of time or how many campaigns the number covers. */
  horizon?: string
  className?: string
}

/** Filled for what was measured or published, hollow for what a model or a scenario made up. */
function ProvenanceDot({ provenance }: { provenance: Provenance }) {
  if (provenance === "missing") return null
  const isFilled = provenance === "observed" || provenance === "retrieved"
  return (
    <span
      aria-hidden
      className={cn(
        "size-1.5 shrink-0 rounded-full border border-foreground",
        isFilled && "bg-foreground"
      )}
    />
  )
}

export function SourceEntry({
  source,
  className,
}: {
  source: SourceRef
  className?: string
}) {
  const { t } = useI18n("case")
  const isCalculation = isCalculationReference(source.id)
  const inputs = useSourceInputs(source.id)

  return (
    <li
      className={cn(
        "flex flex-col gap-1",
        className ?? "border-t pt-2.5 first:border-t-0 first:pt-0"
      )}
    >
      <span className="font-medium">{t(source.dataset)}</span>
      <span className="text-xs text-muted-foreground">
        {isCalculation && `${t("Prepared by")}: `}
        {source.provider} · {t(source.nature.replaceAll("_", " "))}
      </span>
      <dl className="mt-1 grid grid-cols-[4.5rem_1fr] gap-x-2 gap-y-0.5 text-xs">
        <dt className="text-muted-foreground">{t("Period")}</dt>
        <dd>{t(source.period)}</dd>
        <dt className="text-muted-foreground">{t("Location")}</dt>
        <dd>{t(source.location)}</dd>
        <dt className="text-muted-foreground">{t("License")}</dt>
        <dd>{t(source.license ?? "Not stated")}</dd>
      </dl>
      {inputs.length > 0 && (
        <div className="mt-2 text-xs">
          <p className="mb-1 text-muted-foreground">
            {t("Main original inputs")}
          </p>
          <ul className="flex flex-col gap-1">
            {inputs.map((input) => (
              <li key={input.id}>
                {input.url ? (
                  <a
                    href={input.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {t(input.dataset)}
                  </a>
                ) : (
                  t(input.dataset)
                )}
              </li>
            ))}
          </ul>
          {inputs.length < originalInputIds(source.id).length && (
            <p className="mt-2 text-muted-foreground">
              {t("Additional inputs are documented in the linked method.")}
            </p>
          )}
          {source.id === "team_water_scenarios" && (
            <p className="mt-2 text-muted-foreground">
              {t(
                "Crop parameters and sowing dates are documented in the linked simulation method."
              )}
            </p>
          )}
          {source.id === "team_rl_lab" && (
            <p className="mt-2 text-muted-foreground">
              {t(
                "The method also documents FAO-33, INTA sowing dates, World Bank prices and explicit model assumptions."
              )}
            </p>
          )}
        </div>
      )}
      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex w-fit items-center gap-1 rounded-lg text-xs font-medium text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {t(isCalculation ? "Open calculation or method" : "Open the source")}
          <ExternalLink className="size-3" />
        </a>
      )}
    </li>
  )
}

function EvidenceDetails({
  sourceIds,
  meta,
  scaleLabel,
  horizon,
}: {
  sourceIds: ReadonlyArray<string>
  meta: EvidenceMeta | undefined
  scaleLabel: string | undefined
  horizon: string | undefined
}) {
  const { t } = useI18n("case")

  const sources = useEvidenceSources(sourceIds)
  const originalSources = sources.filter(
    (source) => !isCalculationReference(source.id)
  )
  const calculations = sources.filter((source) =>
    isCalculationReference(source.id)
  )
  return (
    <>
      <PopoverHeader>
        <PopoverTitle>{t("Evidence")}</PopoverTitle>
        {meta && (
          <PopoverDescription>
            {t(PROVENANCE[meta.provenance].description)}
          </PopoverDescription>
        )}
      </PopoverHeader>
      {meta && (
        <dl className="grid grid-cols-[4.5rem_1fr] gap-x-2 gap-y-0.5 text-xs">
          <dt className="text-muted-foreground">{t("Scale")}</dt>
          <dd>{t(scaleLabel ?? SCALE_LABEL[meta.scale])}</dd>
          {horizon && (
            <>
              <dt className="text-muted-foreground">{t("Horizon")}</dt>
              <dd>{t(horizon)}</dd>
            </>
          )}
          {meta.unit && (
            <>
              <dt className="text-muted-foreground">{t("Unit")}</dt>
              <dd>{t(meta.unit)}</dd>
            </>
          )}
          {meta.note && (
            <>
              <dt className="text-muted-foreground">{t("Note")}</dt>
              <dd>{t(meta.note)}</dd>
            </>
          )}
        </dl>
      )}
      {originalSources.length > 0 && (
        <section className="border-t pt-2.5">
          <h3 className="mb-3 text-xs font-medium">
            {t("Original data and references")}
          </h3>
          <ul className="flex flex-col gap-2.5">
            {originalSources.map((source) => (
              <SourceEntry key={source.id} source={source} />
            ))}
          </ul>
        </section>
      )}
      {calculations.length > 0 && (
        <section className="border-t pt-2.5">
          <h3 className="mb-3 text-xs font-medium">
            {t("Calculations and method notes")}
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            {t(
              "Results computed from external inputs. The linked method explains how they were produced; they are not observations published by the data providers."
            )}
          </p>
          <ul className="flex flex-col gap-2.5">
            {calculations.map((source) => (
              <SourceEntry key={source.id} source={source} />
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

export function EvidenceChip({
  meta,
  sourceIds,
  scaleLabel,
  horizon,
  className,
}: EvidenceChipProps) {
  const { t } = useI18n("case")

  const citedIds = meta ? meta.source_ids : sourceIds
  const references = useEvidenceSources(citedIds ?? [])
  const ids = references.map((source) => source.id)
  if (!citedIds) return null
  if (ids.length === 0) {
    return (
      <span
        className={cn(
          "inline-flex min-h-5 w-fit items-center rounded-4xl border border-dashed px-2 py-0.5 text-xs text-muted-foreground",
          className
        )}
      >
        {t("No source listed")}
      </span>
    )
  }

  const parts: string[] = []
  if (meta) {
    parts.push(t(PROVENANCE[meta.provenance].label))
    parts.push(t(scaleLabel ?? SCALE_LABEL[meta.scale]))
  }
  parts.push(
    ids.length === 1
      ? t("1 reference")
      : t("{count} references", { count: ids.length })
  )

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex min-h-5 w-fit max-w-full items-center gap-1.5 rounded-4xl border bg-background px-2 py-0.5 text-left text-xs font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-muted data-popup-open:text-foreground",
          className
        )}
      >
        {meta && <ProvenanceDot provenance={meta.provenance} />}
        <span>{parts.join(" · ")}</span>
        <ChevronDown className="size-3 shrink-0" />
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-96 w-80 overflow-y-auto">
        <EvidenceDetails
          sourceIds={ids}
          meta={meta}
          scaleLabel={scaleLabel}
          horizon={horizon}
        />
      </PopoverContent>
    </Popover>
  )
}
