import { Info } from "lucide-react"
import type { ReactNode } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { FOCUS, GLASS_STRONG, isMock, type Provenance } from "./data"

const LABEL: Partial<Record<Provenance, string>> = {
  modeled: "model",
  scenario: "assumed",
  missing: "missing",
}

const HELP: Record<Provenance, string> = {
  observed: "Measured on the ground.",
  retrieved: "Downloaded from the named source as published.",
  modeled: "Output of a model.",
  scenario: "An assumed or simulated value, not a measurement.",
  missing: "Not available yet. Not shown as zero.",
}

type Props = {
  provenance: Provenance
  source_ids: ReadonlyArray<string>
  note?: string | null
}

/**
 * Small tag saying where a number comes from. Real data (observed, retrieved) gets no tag;
 * mock data always does. Opens on tap as well as click, so touch users can read it.
 */
export function ProvenanceTag({ provenance, source_ids, note }: Props) {
  const mock = isMock({ source_ids })
  const label = mock ? "mock" : LABEL[provenance]
  if (!label) {
    return null
  }
  const help =
    note ??
    (mock
      ? "Synthetic number for building the interface. Not a result."
      : HELP[provenance])
  const loud = mock || provenance === "missing"
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex h-5 items-center rounded-full px-1.5 align-middle text-[11px] leading-none font-medium tracking-wide uppercase",
          FOCUS,
          loud
            ? "bg-amber-500/15 text-amber-900 dark:text-amber-200"
            : "bg-foreground/8 text-foreground/75"
        )}
        aria-label={`${label}: ${help}`}
      >
        {label}
      </PopoverTrigger>
      <PopoverContent
        className={cn(GLASS_STRONG, "w-64 text-xs leading-relaxed")}
      >
        {help}
      </PopoverContent>
    </Popover>
  )
}

/** An "i" button that shows a definition on click or tap. */
export function InfoPopover({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Definition: ${label}`}
        className={cn(
          "inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground",
          FOCUS
        )}
      >
        <Info className="size-3.5" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        className={cn(GLASS_STRONG, "w-72 text-xs leading-relaxed")}
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}
