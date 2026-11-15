import {
  Banknote,
  CalendarClock,
  CalendarSearch,
  Database,
  Droplets,
  Grid2x2,
  Layers,
  type LucideIcon,
  MapPinned,
  MousePointerClick,
  Rows3,
  Scale,
  Sprout,
  Tag,
  TrendingUpDown,
  UserCheck,
} from "lucide-react-native"

export type PreviewId =
  | "analog-years"
  | "rotation-comparison"
  | "source-trail"
  | "farm-map"
  | "limits"

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
  /** Planned, and not in this version. It wears the roadmap wording. */
  isRoadmap?: boolean
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

const INTA_CROP_MAP_SOURCE = {
  dataset: "INTA · National Map of Crops",
  period: "Summer maps up to the 2024/25 campaign",
  location: "Argentina, read at the lots of the zone",
} as const

const NASA_HLS_SOURCE = {
  dataset: "NASA HLS · Harmonized Landsat Sentinel-2 imagery",
  period: "Monthly NDVI curves and the 2025/26 crop estimate",
  location: "Lots and reference footprint of the zone",
} as const

const WATER_RUNS_SOURCE = {
  dataset: "Team water-balance runs, released as research output",
  period: "Episodes of three campaigns, start years 1984 to 2022",
  location: "Footprint 268949, Pergamino",
} as const

const SOILGRIDS_SOURCE = {
  dataset: "ISRIC · SoilGrids, soil water capacity by depth",
  period: "Static soil profile",
  location: "Footprint 268949, Pergamino",
} as const

const MAGYP_SOURCE = {
  dataset: "MAGyP · department yields, areas and the regional margin formula",
  period: "Campaigns 1969/70 to 2024/25 for Pergamino",
  location: "Department of the zone",
} as const

const RL_RESULT_SOURCE = {
  dataset:
    "Team tabular rotation MDP: exact dynamic programming, Q-learning and fixed rotations",
  period: "Historical campaigns of each zone",
  location: "The 10 reference zones of Argentina",
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
                    title: "Made-up names are labelled",
                    description:
                      "The farm name in the demo is invented, and the app says so wherever it appears.",
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
            summary: "Roadmap: not in this version.",
            isRoadmap: true,
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
            summary: "Real lots, crops and the NASA grid cell",
            content: {
              headline: "See the real lots of a zone, one by one.",
              lead: "Lots are outlined from satellite imagery. Select one to see the crop of every campaign, its NDVI against the zone and the reason for its status. Each crop says whether it comes from an INTA map or from the team's classifier.",
              preview: "farm-map",
              highlights: [
                {
                  icon: MousePointerClick,
                  title: "Select a lot",
                  description:
                    "Its crop per campaign, its NDVI from September to May against the zone, its vigor gap, its purity and the reason for its status.",
                },
                {
                  icon: Tag,
                  title: "Two crop sources, labelled",
                  description:
                    "Past campaigns come from the INTA crop maps. The latest campaign comes from the team's crop classifier, trained on NASA HLS imagery. Every crop carries its source.",
                },
                {
                  icon: Grid2x2,
                  title: "The grid cell, stated",
                  description:
                    "The map can outline the NASA POWER cell of the zone, about 55 × 57 km. One climate value covers every lot inside it.",
                },
              ],
              details: {
                title: "What the map shows",
                rows: [
                  {
                    title: "Satellite-estimated lots",
                    description:
                      "Outlines and crops are estimates from imagery. They are not a surveyed boundary or a record of what the producer sowed.",
                  },
                  {
                    title: "A made-up farm name",
                    description:
                      "The demo farm carries an invented name, and the app says so next to it. Its numbers are estimates from real imagery.",
                  },
                  {
                    title: "The reference footprint",
                    description:
                      "One footprint is highlighted: the field the water runs were made for. Its INTA crop history, monthly NDVI and soil capacity sit beside the map.",
                  },
                ],
              },
              sources: [
                INTA_CROP_MAP_SOURCE,
                NASA_HLS_SOURCE,
                NASA_POWER_SOURCE,
              ],
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
            summary: "Unmet crop water by rotation",
            content: {
              headline: "Water for one field footprint, run day by day.",
              lead: "On a reference footprint in Pergamino, Cropilot replays released daily water-balance runs for each rotation and shows how much crop water went unmet in the years like this one.",
              preview: "rotation-comparison",
              highlights: [
                {
                  icon: Layers,
                  title: "A starting point you can change",
                  description:
                    "Soil depth of 0.6 or 1.0 m, and initial water of 25, 50 or 75% of capacity. The strips and counts follow your choice.",
                },
                {
                  icon: CalendarClock,
                  title: "A sowing date you can shift",
                  description:
                    "Summer crops sown up to 14 days earlier or later, against the default date.",
                },
                {
                  icon: Droplets,
                  title: "Excess is not flooding",
                  description:
                    "The runs report water above the soil capacity. No model of the team computes waterlogging, so Cropilot never calls it flooding.",
                },
              ],
              details: {
                title: "What the runs cover",
                rows: [
                  {
                    title: "1,170 released runs",
                    description:
                      "Footprint 268949 in Pergamino, three rotations, and 39 three-campaign episodes with start years from 1984 to 2022.",
                  },
                  {
                    title: "One footprint, not every field",
                    description:
                      "The footprint is a 38 ha outline picked in the imagery. It is not validated with a farmer.",
                  },
                  {
                    title: "Three rotations have water",
                    description:
                      "Continuous soybean and cover crop plus soybean have no water run. The comparison shows them as not computed.",
                  },
                ],
              },
              sources: [WATER_RUNS_SOURCE, SOILGRIDS_SOURCE],
            },
          },
          {
            pageSlug: "market",
            title: "Market and profit",
            summary: "Margin by rotation in each analog campaign",
            content: {
              headline: "Margins in the campaigns that started like this one.",
              lead: "For each analog campaign, Cropilot shows the gross margin of every rotation, with and without land rent, and which one led. The order changes from campaign to campaign.",
              preview: "rotation-comparison",
              highlights: [
                {
                  icon: Database,
                  title: "Observed yields first",
                  description:
                    "Department yields from MAGyP, as the anomaly against trend. Where a campaign has none, a NASA POWER climate model fills in and is drawn hollow.",
                },
                {
                  icon: Banknote,
                  title: "A published formula",
                  description:
                    "The MAGyP regional gross-margin formula, which reproduces the published margins within 1 USD/ha. Rent is a toggle.",
                },
                {
                  icon: UserCheck,
                  title: "No winner",
                  description:
                    "Where two rotations swap places between campaigns, the page says so. The call stays with the agronomist.",
                },
              ],
              details: {
                title: "What stands behind the numbers",
                rows: [
                  {
                    title: "Rent",
                    description:
                      "After-rent margins use 648 USD/ha, the rent of the Núcleo Norte area.",
                  },
                  {
                    title: "Prices",
                    description:
                      "A3 futures prices today, with historical ratios between the delivery and the sowing price.",
                  },
                  {
                    title: "Scale",
                    description:
                      "Department yields and a regional formula: the margin describes the department, not one field.",
                  },
                ],
              },
              sources: [MAGYP_SOURCE, NASA_POWER_SOURCE],
            },
          },
          {
            pageSlug: "rotation-planner",
            title: "Rotation planner",
            summary: "Tested, and it did not beat a fixed rotation",
            content: {
              headline:
                "The planner we tested did not beat the best fixed rotation.",
              lead: "We trained reinforcement-learning agents to pick a rotation campaign by campaign. They matched exact dynamic programming, and they did not beat the best fixed rotation in any of the 10 zones: -3 USD/ha/year, 95% CI -8 to +3. So this version compares rotations and recommends none.",
              preview: "limits",
              highlights: [
                {
                  icon: Scale,
                  title: "Matched the exact answer",
                  description:
                    "Q-learning agreed with exact dynamic programming in 85 to 100% of states.",
                },
                {
                  icon: TrendingUpDown,
                  title: "No zone passed",
                  description:
                    "0 of 10 zones passed any criterion. No signal known at decision time was enough.",
                },
                {
                  icon: Sprout,
                  title: "One choice that did matter",
                  description:
                    "In Balcarce, wheat with second soybean beat continuous soybean by +55 USD/ha at today's prices (95% CI +8 to +105).",
                },
              ],
              details: {
                title: "What it means for Cropilot",
                rows: [
                  {
                    title: "No recommendation engine",
                    description:
                      "Cropilot shows each rotation in the campaigns that started like this one and leaves the choice to the agronomist and the producer.",
                  },
                  {
                    title: "A small ceiling",
                    description:
                      "An oracle that knew every campaign in advance would gain +40 USD/ha/year (95% CI +33 to +47), about 10% of the margin. No signal known at decision time captures it.",
                  },
                  {
                    title: "A negative result, reported",
                    description:
                      "Saying what did not work is part of the method, and it is why the app stays a comparison.",
                  },
                ],
              },
              sources: [RL_RESULT_SOURCE],
            },
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
            summary: "The models, open to AI clients. Not in this version.",
            isRoadmap: true,
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
