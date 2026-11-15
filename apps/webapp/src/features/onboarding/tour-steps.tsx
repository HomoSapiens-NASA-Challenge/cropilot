import type { Region } from "@cropilot/api"
import {
  CalendarSearch,
  CircleHelp,
  CloudSun,
  Columns3,
  Droplets,
  FileSearch,
  Lightbulb,
  type LucideIcon,
  MapPin,
  Scale,
  ShieldCheck,
  Sprout,
  Tractor,
  TrendingUp,
  TriangleAlert,
  Waves,
  Wheat,
} from "lucide-react"
import type { ReactNode } from "react"

type TourPoint = { icon: LucideIcon; title: string; description: string }

function TourPoints({ points }: { points: ReadonlyArray<TourPoint> }) {
  return (
    <ul className="flex flex-col gap-5">
      {points.map((point) => (
        <li key={point.title} className="flex gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background text-primary">
            <point.icon className="size-5" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="font-medium">{point.title}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {point.description}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function AsidePanel({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <aside className="flex flex-col gap-4 rounded-xl border bg-background p-6">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {children}
    </aside>
  )
}

function AsideList({
  items,
}: {
  items: ReadonlyArray<{ icon?: LucideIcon; title: string; detail?: string }>
}) {
  return (
    <ul className="flex flex-col divide-y">
      {items.map((item) => (
        <li
          key={item.title}
          className="flex gap-3 py-3 first:pt-0 last:pb-0 text-sm"
        >
          {item.icon && (
            <item.icon className="mt-0.5 size-4 shrink-0 text-primary" />
          )}
          <div className="flex flex-col gap-0.5">
            <span>{item.title}</span>
            {item.detail && (
              <span className="text-muted-foreground">{item.detail}</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Shared layout of a tour step: the explanation on the left, its evidence on the right. */
export function TourStepLayout({
  heading,
  lead,
  points,
  aside,
}: {
  heading: ReactNode
  lead: string
  points: ReadonlyArray<TourPoint>
  aside: ReactNode
}) {
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          {heading}
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            {lead}
          </p>
        </div>
        <TourPoints points={points} />
      </div>
      {aside}
    </div>
  )
}

export function WelcomeStep({ heading }: { heading: ReactNode }) {
  return (
    <TourStepLayout
      heading={heading}
      lead="Plan crop rotations for the farms you advise, with the past campaigns that started like this one as evidence."
      points={[
        {
          icon: Tractor,
          title: "Start from the field",
          description:
            "Location, soil and the rotation the farm runs today. The current rotation is always one of the options compared.",
        },
        {
          icon: CalendarSearch,
          title: "Find years like this one",
          description: "Real past campaigns that began the same way.",
        },
        {
          icon: Sprout,
          title: "Compare rotations",
          description:
            "How each rotation did in each of those campaigns, side by side, with its evidence and its risks.",
        },
      ]}
      aside={
        <AsidePanel title="What you can expect">
          <AsideList
            items={[
              {
                icon: ShieldCheck,
                title: "Your judgment comes first",
                detail:
                  "Cropilot supports the agronomist and the producer. It never replaces them.",
              },
              {
                icon: FileSearch,
                title: "Every number has a source",
                detail: "Dataset, period and location, one click away.",
              },
              {
                icon: CircleHelp,
                title: "Gaps are marked",
                detail:
                  "Missing or assumed values are labeled as such, never filled in.",
              },
            ]}
          />
        </AsidePanel>
      }
    />
  )
}

export function YearsLikeThisStep({ heading }: { heading: ReactNode }) {
  return (
    <TourStepLayout
      heading={heading}
      lead="Cropilot does not forecast the weather. It finds the real campaigns that began like this one and shows what happened in each."
      points={[
        {
          icon: Waves,
          title: "El Niño phase, as known when you decide",
          description:
            "The phase of the Oceanic Niño Index at decision time, never the one that came later in the summer.",
        },
        {
          icon: Droplets,
          title: "Soil moisture at the start",
          description:
            "Root-zone soil wetness from NASA POWER, for the climate cell of your region.",
        },
        {
          icon: CalendarSearch,
          title: "Named and dated",
          description:
            "Each match is a real campaign you can check, not an average.",
        },
      ]}
      aside={
        <AsidePanel title="Data behind the match">
          <AsideList
            items={[
              {
                title: "NASA POWER",
                detail:
                  "Daily root-zone soil wetness and precipitation on a 0.5° × 0.625° grid",
              },
              {
                title: "NOAA Climate Prediction Center",
                detail: "Oceanic Niño Index (ONI), three-month seasons",
              },
              {
                title: "MAGyP",
                detail: "Crop yield estimates by department, Argentina",
              },
              {
                title: "ISRIC SoilGrids",
                detail: "Soil properties behind the water the soil can hold",
              },
            ]}
          />
        </AsidePanel>
      }
    />
  )
}

export function RotationsStep({ heading }: { heading: ReactNode }) {
  return (
    <TourStepLayout
      heading={heading}
      lead="Your farm's current rotation is always one of them. Each one is shown across the matched campaigns, so no single score hides the spread."
      points={[
        {
          icon: Tractor,
          title: "The current rotation is the baseline",
          description: "What the farm runs today, compared like any other.",
        },
        {
          icon: Columns3,
          title: "Side by side",
          description:
            "Each rotation in each matched campaign, named and dated.",
        },
        {
          icon: Scale,
          title: "You make the call",
          description:
            "Cropilot lays out the evidence. You and the producer decide.",
        },
      ]}
      aside={
        <AsidePanel title="Every strategy shows">
          <AsideList
            items={[
              { icon: Lightbulb, title: "Why it is suggested" },
              {
                icon: FileSearch,
                title: "The evidence behind it",
                detail: "Dataset, period and location",
              },
              { icon: TrendingUp, title: "Its benefits" },
              { icon: CircleHelp, title: "What information is missing" },
              { icon: TriangleAlert, title: "Risks that need local review" },
            ]}
          />
        </AsidePanel>
      }
    />
  )
}

export function ReadyStep({
  heading,
  region,
}: {
  heading: ReactNode
  region: Region
}) {
  return (
    <TourStepLayout
      heading={heading}
      lead="Every analysis is scoped to this department. You can change it from the sidebar at any time."
      points={[
        {
          icon: MapPin,
          title: "Reference point",
          description: `${region.latitude_deg.toFixed(2)}°, ${region.longitude_deg.toFixed(2)}°: one rural SoilGrids pixel in ${region.department} department, picked by the team. It is not a surveyed field.`,
        },
        {
          icon: CloudSun,
          title: "Climate",
          description:
            "The NASA POWER cell around that point, about 55 km across.",
        },
        {
          icon: Wheat,
          title: "Yields",
          description: `MAGyP estimates for ${region.department} department, ${region.province}.`,
        },
      ]}
      aside={
        <AsidePanel title="Your region">
          <div className="flex flex-col gap-1">
            <p className="text-2xl font-light tracking-tight">{region.name}</p>
            <p className="text-sm text-muted-foreground">
              {region.department} department, {region.province}
            </p>
          </div>
          {region.known_limit && (
            <p className="flex gap-2 border-t pt-4 text-sm text-muted-foreground">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-primary" />
              {region.known_limit}
            </p>
          )}
        </AsidePanel>
      }
    />
  )
}
