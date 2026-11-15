import { Droplets, FileSearch, type LucideIcon, Waves } from "lucide-react"
import { CtaLink } from "@/features/landing/cta-link"
import { Band, SplitHeading } from "@/features/landing/frame"

const SOURCES: ReadonlyArray<{
  icon: LucideIcon
  provider: string
  title: string
  description: string
}> = [
  {
    icon: Droplets,
    provider: "NASA POWER · GWETROOT",
    title: "Soil water at the start",
    description:
      "Root-zone soil wetness from MERRA-2, daily since 1981. It tells how much water was in the soil when each campaign began.",
  },
  {
    icon: Waves,
    provider: "NOAA · Oceanic Niño Index",
    title: "El Niño and La Niña",
    description:
      "ENSO phase by rolling three-month season, since 1950. Cropilot uses the season already known at decision time, never the summer that followed.",
  },
  {
    icon: FileSearch,
    provider: "Every result",
    title: "Traceable to its source",
    description:
      "Each indicator names its dataset, period and location. NASA POWER describes a grid cell of about 55 × 57 km, not a single field, and the app says so.",
  },
]

export function DataSection() {
  return (
    <Band id="data" tone="inverse" className="scroll-mt-18">
      <div className="flex flex-col items-start gap-8 px-4 pt-20 pb-14 sm:px-6 lg:pt-24">
        <SplitHeading
          tone="inverse"
          lead="NASA Earth data at the center of every comparison."
          className="max-w-3xl"
        >
          Two signals known when the decision is made define what a similar year
          is. Everything shown can be traced back to them.
        </SplitHeading>
        <div className="flex flex-wrap gap-2">
          <CtaLink
            to="/$sectionSlug/$pageSlug"
            params={{ sectionSlug: "data", pageSlug: "nasa-power" }}
            withChevron
          >
            Read about the data
          </CtaLink>
          <CtaLink
            to="/$sectionSlug/$pageSlug"
            params={{ sectionSlug: "data", pageSlug: "similar-years" }}
            variant="inverse"
          >
            How similar years are found
          </CtaLink>
        </div>
      </div>
      <ul className="grid gap-4 px-4 pb-20 sm:px-6 md:grid-cols-3 lg:pb-24">
        {SOURCES.map((source) => (
          <li
            key={source.title}
            className="flex flex-col gap-3 rounded-xl border border-inverse-foreground/10 bg-inverse-foreground/5 p-6"
          >
            <source.icon className="size-5 text-highlight" />
            <p className="mt-2 text-xs tracking-wide text-inverse-muted-foreground uppercase">
              {source.provider}
            </p>
            <h3 className="text-lg font-medium">{source.title}</h3>
            <p className="leading-relaxed text-inverse-muted-foreground">
              {source.description}
            </p>
          </li>
        ))}
      </ul>
    </Band>
  )
}
