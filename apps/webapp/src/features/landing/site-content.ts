import {
  CalendarClock,
  CalendarSearch,
  Database,
  FileSearch,
  Grid2x2,
  Layers,
  type LucideIcon,
  MapPinned,
  MousePointerClick,
  Rows3,
  Sprout,
  TrendingUpDown,
  UserCheck,
} from "lucide-react"

export type PreviewId =
  | "analog-years"
  | "rotation-comparison"
  | "source-trail"
  | "farm-map"
  | "assistant"

export type SitePageContent = {
  headline: string
  lead: string
  preview: PreviewId
  highlights: ReadonlyArray<{
    icon: LucideIcon
    title: string
    description: string
  }>
  details: {
    title: string
    rows: ReadonlyArray<{ title: string; description: string }>
  }
  /** Where the indicators of this page come from: dataset, period and location. */
  sources?: ReadonlyArray<{
    dataset: string
    period: string
    location: string
  }>
}

export type SitePage = {
  pageSlug: string
  title: string
  summary: string
  /** The part of the product this page describes is not wired yet. */
  isInDevelopment?: boolean
  /** Absent while the page is still a placeholder. */
  content?: SitePageContent
}

export type SiteMenu = {
  sectionSlug: string
  label: string
  /** `detailed` shows the summary under each link. `compact` lists titles only. */
  layout: "detailed" | "compact"
  columns: ReadonlyArray<{
    heading: string
    /** Rendered on the tinted side of the panel. */
    isAside?: boolean
    pages: ReadonlyArray<SitePage>
  }>
}

const NASA_POWER_SOURCE = {
  dataset: "NASA POWER · GWETROOT, root-zone soil wetness (MERRA-2)",
  period: "Daily, 1981 to present",
  location: "Grid cell of about 55 × 57 km around the field",
} as const

const NOAA_ONI_SOURCE = {
  dataset: "NOAA · Oceanic Niño Index",
  period: "Rolling three-month seasons, 1950 to present",
  location: "Niño 3.4 region of the equatorial Pacific",
} as const

export const SITE_MENUS: ReadonlyArray<SiteMenu> = [
  {
    sectionSlug: "features",
    label: "Features",
    layout: "detailed",
    columns: [
      {
        heading: "Decide",
        pages: [
          {
            pageSlug: "years-like-this",
            title: "Years like this",
            summary: "Campaigns that started like this one",
            isInDevelopment: true,
            content: {
              headline: "Find the campaigns that started like this one.",
              lead: "Cropilot matches the current campaign to past ones with two signals already known when the decision is made: the El Niño phase and the water in the soil. Then it shows what happened next, campaign by campaign.",
              preview: "analog-years",
              highlights: [
                {
                  icon: CalendarClock,
                  title: "Known at decision time",
                  description:
                    "The El Niño phase is the one that was known when the choice was made, never the one of the summer that followed.",
                },
                {
                  icon: CalendarSearch,
                  title: "Named and dated",
                  description:
                    "Every matched campaign is a real one, shown with its name and date. Nothing is averaged away.",
                },
                {
                  icon: TrendingUpDown,
                  title: "Not a forecast",
                  description:
                    "Cropilot does not predict the weather. It looks back at real campaigns and shows the spread.",
                },
              ],
              details: {
                title: "What makes a year similar",
                rows: [
                  {
                    title: "El Niño phase",
                    description:
                      "From the NOAA Oceanic Niño Index, by rolling three-month season, since 1950.",
                  },
                  {
                    title: "Soil water at the start",
                    description:
                      "Root-zone soil wetness from NASA POWER, daily since 1981.",
                  },
                  {
                    title: "The field",
                    description:
                      "Its location sets the grid cell. NASA POWER describes a cell of about 55 × 57 km, not a single field, and the app says so.",
                  },
                ],
              },
              sources: [NASA_POWER_SOURCE, NOAA_ONI_SOURCE],
            },
          },
          {
            pageSlug: "rotation-strategies",
            title: "Rotation strategies",
            summary: "Three or more rotations, side by side",
            isInDevelopment: true,
            content: {
              headline:
                "Compare rotations side by side, the current one included.",
              lead: "At least three crop rotations for the same field, each one shown against the campaigns that started like this one. No single score hides the spread.",
              preview: "rotation-comparison",
              highlights: [
                {
                  icon: Sprout,
                  title: "The current rotation is always there",
                  description:
                    "Every comparison includes what the farm runs today, so a change is measured against something real.",
                },
                {
                  icon: Rows3,
                  title: "Five answers per strategy",
                  description:
                    "Why it is suggested, the evidence behind it, its benefits, what information is missing and which risks need local review.",
                },
                {
                  icon: UserCheck,
                  title: "Your call",
                  description:
                    "Cropilot supports the agronomist's judgment and the producer's decision. It never replaces them.",
                },
              ],
              details: {
                title: "Every strategy answers",
                rows: [
                  {
                    title: "Why it is suggested",
                    description:
                      "The reasoning in plain language, tied to the matched campaigns.",
                  },
                  {
                    title: "The evidence behind it",
                    description:
                      "Dataset, period and location for every indicator.",
                  },
                  {
                    title: "The benefits it brings",
                    description:
                      "What it changes for soil health and for resilience to climate and water.",
                  },
                  {
                    title: "What information is missing",
                    description:
                      "Assumed or missing values are flagged, never filled in silently.",
                  },
                  {
                    title: "Which risks need local review",
                    description:
                      "What only someone who knows the field can confirm.",
                  },
                ],
              },
            },
          },
          {
            pageSlug: "evidence-trail",
            title: "Evidence trail",
            summary: "Dataset, period and location on every number",
            content: {
              headline: "Every number names its source.",
              lead: "Each indicator in Cropilot carries the dataset it came from, the period it covers and the place it describes. Assumed and missing values are labelled as such.",
              preview: "source-trail",
              highlights: [
                {
                  icon: Database,
                  title: "Dataset",
                  description:
                    "The product and variable behind the number, such as NASA POWER root-zone soil wetness.",
                },
                {
                  icon: CalendarClock,
                  title: "Period",
                  description:
                    "The dates the number covers, so a daily value is never read as a seasonal one.",
                },
                {
                  icon: MapPinned,
                  title: "Location",
                  description:
                    "The area it describes. A grid cell of about 55 × 57 km is not a single field.",
                },
              ],
              details: {
                title: "Honest about its limits",
                rows: [
                  {
                    title: "Assumed values are flagged",
                    description:
                      "A value that was assumed is marked as assumed in the interface.",
                  },
                  {
                    title: "Synthetic data is labelled",
                    description:
                      "Demo farms and seed cases say they are synthetic wherever they appear.",
                  },
                  {
                    title: "No invented numbers",
                    description:
                      "When a value is missing, Cropilot shows that it is missing.",
                  },
                ],
              },
              sources: [NASA_POWER_SOURCE, NOAA_ONI_SOURCE],
            },
          },
          {
            pageSlug: "assistant",
            title: "Assistant",
            summary: "Answers that cite their source",
            isInDevelopment: true,
          },
        ],
      },
      {
        heading: "Field",
        pages: [
          {
            pageSlug: "farms",
            title: "Farms",
            summary: "The farms you advise, in one place",
          },
          {
            pageSlug: "farm-map",
            title: "Farm map",
            summary: "Lots, crops and the NASA grid cell",
            content: {
              headline: "See every farm on the map, lot by lot.",
              lead: "Open a farm to see its lots, the crop on each one and the rotation it runs. Each farm also names the NASA POWER grid cell it falls in, so the scale of the data is never a surprise.",
              preview: "farm-map",
              highlights: [
                {
                  icon: MousePointerClick,
                  title: "Hover a lot",
                  description:
                    "Each lot shows its crop and its area without leaving the map.",
                },
                {
                  icon: Grid2x2,
                  title: "The grid cell, stated",
                  description:
                    "Each farm names the NASA POWER cell it falls in, its size and the farms that share it.",
                },
                {
                  icon: FileSearch,
                  title: "Straight to the source",
                  description:
                    "Each farm links to the raw daily series of its cell in the NASA POWER API.",
                },
              ],
              details: {
                title: "What the map shows today",
                rows: [
                  {
                    title: "Synthetic demo farms",
                    description:
                      "The farms on the map today are made up to show the viewer, and are labelled as such. They are not real parcels.",
                  },
                  {
                    title: "Areas from the boundaries",
                    description:
                      "Lot and farm areas are computed from the drawn boundaries.",
                  },
                  {
                    title: "One cell, many farms",
                    description:
                      "Farms inside the same NASA POWER cell read the same soil water series.",
                  },
                ],
              },
              sources: [NASA_POWER_SOURCE],
            },
          },
        ],
      },
      {
        heading: "Models",
        pages: [
          {
            pageSlug: "soil-and-climate",
            title: "Soil and climate",
            summary: "Climate risk, soil and carbon by rotation",
            isInDevelopment: true,
          },
          {
            pageSlug: "water-balance",
            title: "Water balance",
            summary: "Field water by rotation",
            isInDevelopment: true,
          },
          {
            pageSlug: "market",
            title: "Market and profit",
            summary: "Profit and market by rotation",
            isInDevelopment: true,
          },
          {
            pageSlug: "rotation-planner",
            title: "Rotation planner",
            summary: "Builds and orders rotation strategies",
            isInDevelopment: true,
          },
          {
            pageSlug: "imagery",
            title: "Imagery",
            summary: "Maps and segmentation from images",
            isInDevelopment: true,
          },
        ],
      },
      {
        heading: "More",
        isAside: true,
        pages: [
          {
            pageSlug: "roadmap",
            title: "Roadmap",
            summary: "See what is ahead",
          },
          {
            pageSlug: "mcp-tools",
            title: "MCP tools",
            summary: "The models, open to AI clients",
            isInDevelopment: true,
          },
        ],
      },
    ],
  },
  {
    sectionSlug: "solutions",
    label: "Solutions",
    layout: "compact",
    columns: [
      {
        heading: "By role",
        pages: [
          {
            pageSlug: "agronomists",
            title: "Agronomists",
            summary: "Evidence for the advisor who makes the call.",
          },
          {
            pageSlug: "producers",
            title: "Producers and their advisors",
            summary: "A shared view for the producer and the agronomist.",
          },
        ],
      },
      {
        heading: "By campaign start",
        pages: [
          {
            pageSlug: "el-nino-campaigns",
            title: "El Niño campaigns",
            summary: "Campaigns that start under El Niño.",
          },
          {
            pageSlug: "la-nina-campaigns",
            title: "La Niña campaigns",
            summary: "Campaigns that start under La Niña.",
          },
          {
            pageSlug: "neutral-campaigns",
            title: "Neutral campaigns",
            summary: "Campaigns that start in a neutral phase.",
          },
        ],
      },
      {
        heading: "By goal",
        pages: [
          {
            pageSlug: "soil-health",
            title: "Soil health",
            summary: "Rotations compared by what they do to the soil.",
          },
          {
            pageSlug: "climate-resilience",
            title: "Climate resilience",
            summary: "Rotations compared across the campaigns like this one.",
          },
          {
            pageSlug: "water-resilience",
            title: "Water resilience",
            summary: "Rotations compared by the water they leave in the soil.",
          },
        ],
      },
      {
        heading: "Region",
        isAside: true,
        pages: [
          {
            pageSlug: "argentina",
            title: "Argentina",
            summary: "Built for Argentine farms.",
          },
        ],
      },
    ],
  },
  {
    sectionSlug: "data",
    label: "Data",
    layout: "compact",
    columns: [
      {
        heading: "Sources",
        pages: [
          {
            pageSlug: "nasa-power",
            title: "NASA POWER",
            summary: "Root-zone soil wetness, daily since 1981.",
            content: {
              headline: "NASA POWER, the soil water signal.",
              lead: "Cropilot reads root-zone soil wetness from NASA POWER to know how much water was in the soil when each campaign began.",
              preview: "source-trail",
              highlights: [
                {
                  icon: Layers,
                  title: "Root-zone soil wetness",
                  description:
                    "The GWETROOT variable, from the MERRA-2 reanalysis.",
                },
                {
                  icon: CalendarClock,
                  title: "Daily since 1981",
                  description:
                    "A record long enough to look for campaigns that started the same way.",
                },
                {
                  icon: Grid2x2,
                  title: "A grid cell, not a field",
                  description:
                    "About 55 × 57 km. Cropilot states the scale next to every value.",
                },
              ],
              details: {
                title: "How Cropilot uses it",
                rows: [
                  {
                    title: "At the start of the campaign",
                    description:
                      "The soil water when the decision is made is one of the two signals that define a similar year.",
                  },
                  {
                    title: "Alongside El Niño",
                    description:
                      "It is paired with the El Niño phase from the NOAA Oceanic Niño Index.",
                  },
                  {
                    title: "With its limits stated",
                    description:
                      "It is an estimate at grid scale. What the agronomist knows about the field comes first.",
                  },
                ],
              },
              sources: [NASA_POWER_SOURCE],
            },
          },
          {
            pageSlug: "noaa-oni",
            title: "NOAA Oceanic Niño Index",
            summary: "El Niño and La Niña phase, since 1950.",
          },
          {
            pageSlug: "all-sources",
            title: "All sources and licenses",
            summary: "Every dataset Cropilot reads, with its license.",
          },
        ],
      },
      {
        heading: "Method",
        pages: [
          {
            pageSlug: "similar-years",
            title: "How similar years are found",
            summary: "The two signals that define a year like this one.",
          },
          {
            pageSlug: "decision-time",
            title: "Only what is known at decision time",
            summary: "Why the El Niño phase is never the one of the summer.",
          },
          {
            pageSlug: "limits",
            title: "Limits and assumptions",
            summary: "What the data can and cannot say about a field.",
          },
        ],
      },
      {
        heading: "Trust",
        isAside: true,
        pages: [
          {
            pageSlug: "not-a-forecast",
            title: "What Cropilot does not do",
            summary:
              "No weather forecast, no single score, no replacement for the agronomist.",
          },
        ],
      },
    ],
  },
  {
    sectionSlug: "resources",
    label: "Resources",
    layout: "compact",
    columns: [
      {
        heading: "Learn",
        pages: [
          {
            pageSlug: "getting-started",
            title: "Getting started",
            summary: "From signing in to the first comparison.",
          },
          {
            pageSlug: "glossary",
            title: "Glossary",
            summary: "The terms Cropilot uses, in plain language.",
          },
          {
            pageSlug: "faq",
            title: "Questions and answers",
            summary: "What agronomists ask first.",
          },
        ],
      },
      {
        heading: "Project",
        pages: [
          {
            pageSlug: "team",
            title: "About the team",
            summary: "Who builds Cropilot.",
          },
          {
            pageSlug: "space-apps",
            title: "NASA Space Apps Challenge 2026",
            summary:
              "Cropilot answers the challenge Field Shift: Adapting Farms with NASA Data.",
          },
          {
            pageSlug: "use-of-ai",
            title: "Use of AI",
            summary: "Where AI was used to build Cropilot.",
          },
        ],
      },
      {
        heading: "Contact",
        isAside: true,
        pages: [
          {
            pageSlug: "contact",
            title: "Contact the team",
            summary: "Reach the people behind Cropilot.",
          },
          {
            pageSlug: "source-code",
            title: "Source code",
            summary: "The code behind Cropilot.",
          },
        ],
      },
    ],
  },
]

/** The page behind `/$sectionSlug/$pageSlug`, with the menu it belongs to. */
export function findSitePage(sectionSlug: string, pageSlug: string) {
  const menu = SITE_MENUS.find((entry) => entry.sectionSlug === sectionSlug)
  if (!menu) {
    return undefined
  }
  for (const column of menu.columns) {
    const page = column.pages.find((entry) => entry.pageSlug === pageSlug)
    if (page) {
      return { menu, column, page }
    }
  }
  return undefined
}
