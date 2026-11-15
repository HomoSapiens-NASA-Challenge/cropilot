import type { CaseBundle, CaseIndex } from "@cropilot/api"
import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { NotAvailable } from "@/features/case/block-frame"
import { CaseNav, type CaseSection } from "@/features/case/case-nav"
import { CompareBlock } from "@/features/case/compare-block"
import { FieldMapBlock } from "@/features/case/field-block"
import { MethodBlock } from "@/features/case/method-block"
import { NationalBlock } from "@/features/case/national-block"
import { StartBlock } from "@/features/case/start-block"
import { YearsBlock } from "@/features/case/years-block"
import { REFERENCE_CASE_ZONE_ID } from "@/lib/reference-case"

const SECTIONS: ReadonlyArray<CaseSection> = [
  { id: "campaign", label: "Campaign" },
  { id: "start", label: "Start" },
  { id: "years", label: "Years like this" },
  { id: "compare", label: "Compare" },
  { id: "field", label: "Field" },
  { id: "method", label: "Method and limits" },
]

/** First campaign of the record, to say "above every campaign since 1981". */
function firstStartYear(bundle: CaseBundle): number | undefined {
  const years = bundle.years_like_this.campaigns.map(
    (campaign) => campaign.start_year
  )
  return years.length > 0 ? Math.min(...years) : undefined
}

/** A zone with no case yet: no numbers, and the way to one that has. */
export function CaseNotFound({ zoneId }: { zoneId: string }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6">
      <NotAvailable
        title="No case data for this region yet"
        description={`There is no 2026/27 case for "${zoneId}". The reference case, Pergamino, has every block.`}
      >
        <Link
          to="/case/$zoneId"
          params={{ zoneId: REFERENCE_CASE_ZONE_ID }}
          className={buttonVariants({ variant: "outline" })}
        >
          Open the Pergamino case
          <ArrowRight data-icon="inline-end" />
        </Link>
      </NotAvailable>
    </div>
  )
}

/**
 * The public case of one zone, no sign-in needed: the national campaign, how it starts
 * here, the years like this, the rotations compared, the field, and the method.
 */
export function CasePage({
  index,
  bundle,
}: {
  index: CaseIndex
  bundle: CaseBundle
}) {
  return (
    <TooltipProvider>
      <CaseNav zoneId={bundle.zone_id} sections={SECTIONS} />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 pt-12 pb-24 sm:px-6 lg:gap-20 lg:pt-16">
        <header className="flex max-w-3xl flex-col gap-4">
          <p className="text-sm">
            <span className="font-medium">
              {index.campaign} case, {bundle.zone_name}
            </span>{" "}
            <span className="text-muted-foreground">
              · public, read-only, no sign-in
            </span>
          </p>
          <h1 className="text-3xl/9 font-light tracking-tight text-balance sm:text-5xl/14">
            Real campaigns that started like {index.campaign}, not a forecast.
          </h1>
          <p className="text-xl/8 font-light text-muted-foreground">
            Cropilot supports the agronomist and the producer. It shows what
            happened to each rotation in the past campaigns that began like this
            one, and it names the source of every number.
          </p>
        </header>
        <NationalBlock
          id="campaign"
          index={index}
          glossary={bundle.glossary}
          sinceYear={firstStartYear(bundle)}
          selectedZoneId={bundle.zone_id}
        />
        <StartBlock id="start" bundle={bundle} />
        <YearsBlock id="years" bundle={bundle} />
        <CompareBlock id="compare" bundle={bundle} />
        <FieldMapBlock id="field" bundle={bundle} />
        <MethodBlock id="method" bundle={bundle} />
      </div>
    </TooltipProvider>
  )
}
