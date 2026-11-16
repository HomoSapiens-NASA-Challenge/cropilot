import { cn } from "cn"
import { PreviewWindow } from "@/features/landing/previews/preview-window"
import { useI18n } from "@/lib/i18n"

export type ScreenshotId =
  | "case-hero"
  | "campaign-map"
  | "case-start"
  | "years-scatter"
  | "years-table"
  | "years-limit"
  | "campaign-notes"
  | "compare-cards"
  | "compare-worst"
  | "compare-water"
  | "compare-answers"
  | "compare-not-computed"
  | "field-footprint"
  | "parana-field"
  | "source-popover"
  | "method-limits"
  | "method-sources"
  | "method-glossary"

// Captures of the running public case, taken on 2026-11-15.
const SCREENSHOTS: Record<
  ScreenshotId,
  { windowTitle: string; caption: string }
> = {
  "case-hero": {
    windowTitle: "Public case · Pergamino",
    caption: "The public 2026/27 case for Pergamino: read-only, no sign-in.",
  },
  "campaign-map": {
    windowTitle: "Public case · Campaign",
    caption:
      "The 2026/27 El Niño signal and the soil water of each reference zone.",
  },
  "case-start": {
    windowTitle: "Public case · Start",
    caption: "The two signals known at the decision, with the decision itself.",
  },
  "years-scatter": {
    windowTitle: "Public case · Years like this",
    caption:
      "Every past campaign placed by El Niño index and starting soil water.",
  },
  "years-table": {
    windowTitle: "Public case · Years like this",
    caption:
      "The closest past campaigns, ranked, with their signals and yields.",
  },
  "years-limit": {
    windowTitle: "Public case · Years like this",
    caption: "The measured limit of the method, shown next to its result.",
  },
  "campaign-notes": {
    windowTitle: "Public case · Years like this",
    caption:
      "Notes on named campaigns, including dry and counter-example years.",
  },
  "compare-cards": {
    windowTitle: "Public case · Compare",
    caption: "The current rotation and the alternatives, side by side.",
  },
  "compare-worst": {
    windowTitle: "Public case · Compare",
    caption:
      "The worst similar campaign of each strategy, and crops not harvested.",
  },
  "compare-water": {
    windowTitle: "Public case · Compare",
    caption:
      "Water runs of each rotation, with the starting water and sowing date you set.",
  },
  "compare-answers": {
    windowTitle: "Public case · Compare",
    caption:
      "Why, evidence, benefits, missing information and risks for every strategy.",
  },
  "compare-not-computed": {
    windowTitle: "Public case · Compare",
    caption: "What the case does not compute, listed instead of hidden.",
  },
  "field-footprint": {
    windowTitle: "Public case · Field",
    caption: "The reference footprint: INTA crop history and monthly NDVI.",
  },
  "parana-field": {
    windowTitle: "Public case · Paraná",
    caption: "The crop-map fields of the Paraná case.",
  },
  "source-popover": {
    windowTitle: "Public case · Start",
    caption:
      "Each value opens its sources: dataset, provider, period and location.",
  },
  "method-limits": {
    windowTitle: "Public case · Method and limits",
    caption: "The limits of the method, each with its measurement.",
  },
  "method-sources": {
    windowTitle: "Public case · Method and limits",
    caption:
      "The source table: dataset, provider, period, location and license.",
  },
  "method-glossary": {
    windowTitle: "Public case · Method and limits",
    caption: "The glossary the case links its terms to.",
  },
}

/** A still capture of the running app, framed like the product previews. */
export function Screenshot({
  id,
  className,
}: {
  id: ScreenshotId
  className?: string
}) {
  const { locale, t } = useI18n("landing")
  const { windowTitle, caption } = SCREENSHOTS[id]
  return (
    <figure className={cn("flex flex-col gap-3", className)}>
      <PreviewWindow
        title={t(windowTitle)}
        badge={t("Screenshot")}
        bodyClassName="bg-secondary"
      >
        <img
          src={`/screenshots/${id}.webp`}
          alt={t("Screenshot of Cropilot: {caption}", { caption: t(caption) })}
          width={1160}
          height={662}
          loading="lazy"
          className="block h-auto w-full"
        />
      </PreviewWindow>
      <figcaption className="text-sm text-muted-foreground">
        {t(caption)}
        {locale === "es" && <> {t("Capture recorded in English")}</>}
      </figcaption>
    </figure>
  )
}
