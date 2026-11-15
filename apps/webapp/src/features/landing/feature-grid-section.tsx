import { Link } from "@tanstack/react-router"
import { cn } from "cn"
import { Maximize2 } from "lucide-react"
import type { ReactNode } from "react"
import { Band, SplitHeading } from "@/features/landing/frame"
import { AnalogYearsPreview } from "@/features/landing/previews/analog-years-preview"
import { AssistantPreview } from "@/features/landing/previews/assistant-preview"
import { FarmMapPreview } from "@/features/landing/previews/farm-map-preview"
import { RotationComparisonPreview } from "@/features/landing/previews/rotation-comparison-preview"
import { SourceTrailPreview } from "@/features/landing/previews/source-trail-preview"
import { StrandsArt } from "@/features/landing/strands-art"

function FeatureCard({
  title,
  pageSlug,
  className,
  children,
}: {
  title: string
  /** Page under `/features` that the card opens. */
  pageSlug: string
  className?: string
  children: ReactNode
}) {
  return (
    <article
      className={cn(
        "group/card relative isolate flex flex-col overflow-hidden rounded-xl border bg-linear-to-b from-card from-40% to-accent transition-shadow hover:shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4 p-6">
        <h3 className="max-w-xs text-2xl/7 font-light tracking-tight text-balance">
          {title}
        </h3>
        <Link
          to="/$sectionSlug/$pageSlug"
          params={{ sectionSlug: "features", pageSlug }}
          aria-label={`Open ${title}`}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary outline-none transition-colors after:absolute after:inset-0 after:z-10 focus-visible:ring-3 focus-visible:ring-ring/50 group-hover/card:bg-primary group-hover/card:text-primary-foreground"
        >
          <Maximize2 className="size-4" />
        </Link>
      </div>
      <div className="mt-auto px-6 pt-2 pb-6">{children}</div>
    </article>
  )
}

export function FeatureGridSection() {
  return (
    <Band id="features" tone="tinted" className="scroll-mt-18">
      <div className="flex flex-col gap-14 px-4 py-20 sm:px-6 lg:py-24">
        <SplitHeading
          lead="One view for the whole decision."
          className="max-w-3xl"
        >
          From the field on the map to the rotations compared, with every number
          traced back to its source.
        </SplitHeading>
        <div className="grid gap-4 lg:grid-cols-3">
          <FeatureCard
            title="Find the campaigns that started like this one"
            pageSlug="years-like-this"
            className="lg:col-span-2"
          >
            <StrandsArt className="absolute inset-0 -z-10 hidden size-full sm:block" />
            <AnalogYearsPreview className="mx-auto max-w-xl" />
          </FeatureCard>
          <FeatureCard
            title="Compare three or more rotations"
            pageSlug="rotation-strategies"
          >
            <RotationComparisonPreview />
          </FeatureCard>
          <FeatureCard
            title="Every number names its source"
            pageSlug="evidence-trail"
          >
            <SourceTrailPreview />
          </FeatureCard>
          <FeatureCard title="See every farm, lot by lot" pageSlug="farm-map">
            <FarmMapPreview />
          </FeatureCard>
          <FeatureCard
            title="Ask, and get answers that cite their data"
            pageSlug="assistant"
          >
            <AssistantPreview />
          </FeatureCard>
        </div>
      </div>
    </Band>
  )
}
