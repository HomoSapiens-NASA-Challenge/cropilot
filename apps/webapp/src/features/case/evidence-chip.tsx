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
import { useSources } from "@/features/case/case-context"
import {
  PROVENANCE,
  type Provenance,
  SCALE_LABEL,
} from "@/features/case/case-format"

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

function SourceEntry({ source }: { source: SourceRef }) {
  return (
    <li className="flex flex-col gap-1 border-t pt-2.5 first:border-t-0 first:pt-0">
      <span className="font-medium">{source.dataset}</span>
      <span className="text-xs text-muted-foreground">
        {source.provider} · {source.nature.replace("_", " ")}
      </span>
      <dl className="mt-1 grid grid-cols-[4.5rem_1fr] gap-x-2 gap-y-0.5 text-xs">
        <dt className="text-muted-foreground">Period</dt>
        <dd>{source.period}</dd>
        <dt className="text-muted-foreground">Location</dt>
        <dd>{source.location}</dd>
        {source.license && (
          <>
            <dt className="text-muted-foreground">License</dt>
            <dd>{source.license}</dd>
          </>
        )}
      </dl>
      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex w-fit items-center gap-1 rounded-lg text-xs font-medium text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Open the source
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
  const sources = useSources(sourceIds)
  return (
    <>
      <PopoverHeader>
        <PopoverTitle>Evidence</PopoverTitle>
        {meta && (
          <PopoverDescription>
            {PROVENANCE[meta.provenance].description}
          </PopoverDescription>
        )}
      </PopoverHeader>
      {meta && (
        <dl className="grid grid-cols-[4.5rem_1fr] gap-x-2 gap-y-0.5 text-xs">
          <dt className="text-muted-foreground">Scale</dt>
          <dd>{scaleLabel ?? SCALE_LABEL[meta.scale]}</dd>
          {horizon && (
            <>
              <dt className="text-muted-foreground">Horizon</dt>
              <dd>{horizon}</dd>
            </>
          )}
          {meta.unit && (
            <>
              <dt className="text-muted-foreground">Unit</dt>
              <dd>{meta.unit}</dd>
            </>
          )}
          {meta.note && (
            <>
              <dt className="text-muted-foreground">Note</dt>
              <dd>{meta.note}</dd>
            </>
          )}
        </dl>
      )}
      <ul className="flex flex-col gap-2.5 border-t pt-2.5">
        {sources.map((source) => (
          <SourceEntry key={source.id} source={source} />
        ))}
      </ul>
    </>
  )
}

/**
 * The line that goes with a number: how it was obtained (provenance), what it describes
 * (scale) and where it comes from. The popover lists dataset, period, location and link.
 */
export function EvidenceChip({
  meta,
  sourceIds,
  scaleLabel,
  horizon,
  className,
}: EvidenceChipProps) {
  const ids = meta ? meta.source_ids : sourceIds
  if (!ids) return null
  if (ids.length === 0) {
    return (
      <span
        className={cn(
          "inline-flex min-h-5 w-fit items-center rounded-4xl border border-dashed px-2 py-0.5 text-xs text-muted-foreground",
          className
        )}
      >
        No source listed
      </span>
    )
  }

  const parts: string[] = []
  if (meta) {
    parts.push(PROVENANCE[meta.provenance].label)
    parts.push(scaleLabel ?? SCALE_LABEL[meta.scale])
  }
  parts.push(ids.length === 1 ? "1 source" : `${ids.length} sources`)

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
