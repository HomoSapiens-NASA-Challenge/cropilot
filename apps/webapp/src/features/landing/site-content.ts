import {
  Ban,
  Banknote,
  BookOpen,
  CalendarClock,
  CalendarSearch,
  CloudRain,
  Code,
  Compass,
  Database,
  Droplets,
  FileText,
  Flag,
  FlaskConical,
  Globe,
  Grid2x2,
  Handshake,
  Info,
  Layers,
  ListChecks,
  type LucideIcon,
  Mail,
  MapPinned,
  MessageSquare,
  MousePointerClick,
  Plug,
  Rows3,
  Satellite,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Sprout,
  Tag,
  Thermometer,
  Tractor,
  TrendingUpDown,
  UserCheck,
  Users,
  Waves,
} from "lucide-react"
import type { RecordingId } from "@/features/landing/recording"

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
  /** A screen recording of the real app, shown instead of the drawn preview. */
  recording?: RecordingId
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
  /** Links to read next or to open outside the site. */
  links?: ReadonlyArray<{
    label: string
    description: string
    href: string
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
  content: SitePageContent
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

const MAGYP_AREA_SOURCE = {
  dataset: "MAGyP · agricultural estimates, planted and harvested area",
  period: "March 2026 estimates file",
  location: "The ten reference departments",
} as const

const CASE_BUNDLE_SOURCE = {
  dataset: "Team case bundles (case-v1), built offline from the team's outputs",
  period: "Historical campaigns. Nothing is computed when a page opens",
  location:
    "The ten reference departments. The water runs cover Pergamino only",
} as const

const CROP_MAP_SOURCE = {
  dataset: "Team crop map by field (crop-map-v1), on NASA HLS and INTA maps",
  period: "Summer campaigns 2020/21 to 2025/26. 2025/26 comes from the model",
  location: "Two 20 × 20 km zones: Pergamino and Paraná",
} as const

const PLANNER_SOURCE = {
  dataset:
    "Team rotation simulator on NASA POWER weather, NOAA ONI, SoilGrids and MAGyP",
  period:
    "Training campaigns 1984/85 to 2012/13, held-out campaigns 2013/14 to 2024/25",
  location: "The region of the workspace, one of the ten reference departments",
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
              recording: "years-like-this",
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
              recording: "compare",
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
            summary: "Ask Cropilot: sourced answers, by text or voice",
            content: {
              headline:
                "Ask about the evidence, and get answers with their sources.",
              lead: "Ask Cropilot explains what the case and the planner already show. Type a question or record one. Every answer comes with sources, and its tables come from the app's own data, not from the language model.",
              preview: "source-trail",
              highlights: [
                {
                  icon: MessageSquare,
                  title: "Text or recorded voice",
                  description:
                    "Type, or record up to 60 seconds. You review and edit the transcript before sending. An optional spoken excerpt is labelled as AI-generated and sits beside the full written answer.",
                },
                {
                  icon: ShieldCheck,
                  title: "Sources on every answer",
                  description:
                    "Each paragraph must cite a known source, and an answer with an unknown source is refused. Expand the evidence tables to see the numbers behind a claim.",
                },
                {
                  icon: UserCheck,
                  title: "It explains, never decides",
                  description:
                    "It is read-only. It runs no new simulation, sends no message and browses no web. The call stays with the agronomist and the producer.",
                },
              ],
              details: {
                title: "What it can and cannot do",
                rows: [
                  {
                    title: "Where it works",
                    description:
                      "On the public case, with no sign-in, and on a finished planner run when you are signed in. A planner result can only be read by its owner.",
                  },
                  {
                    title: "What it reads",
                    description:
                      "The same evidence as the public MCP server: the cases, the analog years, the rotation comparison and the field evidence, plus your planner result. The region is fixed by the page you are on.",
                  },
                  {
                    title: "Water questions",
                    description:
                      "It works with the released combinations of soil depth, initial water and sowing shift. A missing value stays missing, and excess water is never presented as a flood forecast.",
                  },
                  {
                    title: "Voice, as it is today",
                    description:
                      "Recorded turns in the web app. It is not a live call, and the mobile app has no voice or assistant screen.",
                  },
                  {
                    title: "It can be wrong",
                    description:
                      "Source checks do not prove that every sentence is supported. In one test it read a zero difference as a zero deficit, and the team added explicit metric definitions afterwards. Read the tables, and use your judgment.",
                  },
                  {
                    title: "What leaves the server",
                    description:
                      "Your question, the last exchanges and the selected evidence go to OpenAI from the server, never from the browser. Cropilot does not store recordings or spoken replies. Processing at the provider is separate.",
                  },
                ],
              },
              sources: [CASE_BUNDLE_SOURCE, PLANNER_SOURCE],
            },
          },
        ],
      },
      {
        heading: "Field",
        pages: [
          {
            pageSlug: "farms",
            title: "Farms",
            summary: "The farms you advise, saved to your account",
            content: {
              headline: "Keep the farms you advise in one place.",
              lead: "Signed in, you list the farms you advise by name. Today a farm is a saved name: the evidence in Cropilot describes the region and the demo field, not yet each farm you add.",
              preview: "farm-map",
              highlights: [
                {
                  icon: Tractor,
                  title: "Your farms, your account",
                  description:
                    "Add a farm by name and it is saved to your account. Each signed-in user sees their own list.",
                },
                {
                  icon: MapPinned,
                  title: "A region sets the scope",
                  description:
                    "After signing in you choose one of the ten reference departments, with Pergamino preselected. Comparisons, the planner and the assistant work on that region, and you can change it later.",
                },
                {
                  icon: Ban,
                  title: "Names only, for now",
                  description:
                    "A farm does not hold lots, boundaries, crops or sowing dates yet, and Cropilot does not guess them. To see real lots, open the farm map of a demo zone.",
                },
              ],
              details: {
                title: "How farms fit in",
                rows: [
                  {
                    title: "The demo farm is made up",
                    description:
                      "La Celina, the farm in the public map, has an invented name. Its 18 lots are real field outlines with satellite-estimated crops.",
                  },
                  {
                    title: "Private farms stay private",
                    description:
                      "The public case and the MCP server never read the farms of a user.",
                  },
                  {
                    title: "Lots on your own farm",
                    description:
                      "Attaching lots and crop history to a farm is not in this version.",
                  },
                ],
              },
            },
          },
          {
            pageSlug: "farm-map",
            title: "Farm map",
            summary: "Real lots, crops and the NASA grid cell",
            content: {
              headline: "See the real lots of a zone, one by one.",
              lead: "Lots are outlined from satellite imagery. Select one to see the crop of every campaign, its NDVI against the zone and the reason for its status. Each crop says whether it comes from an INTA map or from the team's classifier.",
              preview: "farm-map",
              recording: "field-map",
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
                  {
                    title: "Two zones",
                    description:
                      "Pergamino, with the 18 lots of the made-up farm La Celina plus 363 more fields, and Paraná with 496 fields. Each zone is 20 × 20 km. Crops run from the 2020/21 to the 2025/26 campaign.",
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
            summary:
              "Soil water and climate signals today. Carbon and risk scores not yet",
            isInDevelopment: true,
            content: {
              headline: "What Cropilot knows about soil and climate today.",
              lead: "Cropilot uses NASA POWER soil wetness and the El Niño phase to find similar campaigns, and SoilGrids to size the water a soil can hold. Soil carbon, nitrogen and a climate-risk score by rotation are not in this version.",
              preview: "source-trail",
              highlights: [
                {
                  icon: Droplets,
                  title: "Soil water at the start",
                  description:
                    "NASA POWER root-zone wetness says how wet the soil was when each campaign began, at the scale of a 55 × 57 km cell.",
                },
                {
                  icon: Layers,
                  title: "Capacity by depth",
                  description:
                    "SoilGrids retention sets how much water a profile of 0.6 or 1.0 m can hold in the water runs. Depth and initial water are assumptions you can change, not measurements.",
                },
                {
                  icon: Thermometer,
                  title: "Heat, counted and not scored",
                  description:
                    "The water runs count days above 35 °C and the days when heat and water stress overlap, by crop stage. It is a screen, not a validated damage function.",
                },
              ],
              details: {
                title: "What is here, and what is not",
                rows: [
                  {
                    title: "Soil carbon",
                    description:
                      "Not modelled. The soil priority of the planner uses days of bare soil and rain on bare soil, not carbon.",
                  },
                  {
                    title: "Nitrogen and residues",
                    description:
                      "Not modelled. In the simulator only the soil water carries from one campaign to the next.",
                  },
                  {
                    title: "Regional wetness models",
                    description:
                      "The team trained 7 and 14 day wetness models as research. Their gains over simple baselines have intervals that include zero, so they are not in the app.",
                  },
                  {
                    title: "Climate risk by rotation",
                    description:
                      "Not a score. Cropilot shows what happened to each rotation in the real campaigns that started alike.",
                  },
                ],
              },
              sources: [NASA_POWER_SOURCE, SOILGRIDS_SOURCE, WATER_RUNS_SOURCE],
            },
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
            summary: "Live simulation, an exact optimum and an honest verdict",
            content: {
              headline:
                "Plan campaign by campaign, and see if it beats a fixed rotation.",
              lead: "Signed in, you set how much each outcome matters and a horizon of 1 to 5 campaigns. Cropilot simulates your region live, solves for the exact optimum and trains five Q-learning agents. Against the best fixed rotation the result can be inconclusive, and the planner reports that.",
              preview: "rotation-comparison",
              recording: "planner",
              highlights: [
                {
                  icon: SlidersHorizontal,
                  title: "You set what matters",
                  description:
                    "A three-step wizard weights five outcomes: gross margin, crop water deficit, days of bare soil, rain on bare soil and drainage. You also choose a horizon of 1 to 5 campaigns.",
                },
                {
                  icon: FlaskConical,
                  title: "Computed live",
                  description:
                    "Each run simulates the region on NASA POWER weather, with no cached results. It reports the exact value of each agent's policy at every checkpoint, never a noisy estimate.",
                },
                {
                  icon: Scale,
                  title: "An honest verdict",
                  description:
                    "Every policy is replayed on held-out campaigns, 2013/14 to 2024/25. Against the best fixed rotation the optimum can be better, worse, inconclusive or identical, and the planner says which.",
                },
              ],
              details: {
                title: "How a run works",
                rows: [
                  {
                    title: "Simulate",
                    description:
                      "The team's rotation simulator runs a daily soil water balance for every training campaign, 1984/85 to 2012/13, and every itinerary the region allows, at 11 soil water levels.",
                  },
                  {
                    title: "Solve exactly",
                    description:
                      "Backward induction over a table of states: campaign, soil water and El Niño phase. Two decisions per campaign: wheat or fallow in June, and the summer crop in late August.",
                  },
                  {
                    title: "Train five agents",
                    description:
                      "Five tabular Q-learning agents start from different random seeds, to show that reaching the optimum does not hinge on one seed.",
                  },
                  {
                    title: "Compare fairly",
                    description:
                      "The optimum is compared with the best fixed rotation, a one-campaign-at-a-time rule, a margin-only plan and the case strategies of the region, paired campaign by campaign over 12 held-out campaigns.",
                  },
                  {
                    title: "Inconclusive is a result",
                    description:
                      "The interval resamples 4 blocks of 3 campaigns, 256 combinations with no random draws. That is coarse: better needs nearly every block to agree. Many regions show little gain over a good fixed rotation, and the verdict says so.",
                  },
                  {
                    title: "Its limits",
                    description:
                      "It inherits the simulator's limits: a 55 km weather cell, department yields, no nitrogen, residues, diseases or excess water, international price benchmarks and assumed costs. Cover crops are not modelled. The output is a simulated scenario, not a recommendation.",
                  },
                ],
              },
              sources: [PLANNER_SOURCE, NOAA_ONI_SOURCE],
            },
          },
          {
            pageSlug: "imagery",
            title: "Imagery",
            summary: "Crop maps and NDVI from NASA HLS imagery",
            content: {
              headline: "What Cropilot reads from satellite images.",
              lead: "Cropilot turns NASA HLS imagery into a crop for every field and every summer, and into a vigor curve that compares each field with its neighbours. The team's models read the imagery offline. Opening a page never runs a satellite model.",
              preview: "farm-map",
              highlights: [
                {
                  icon: Satellite,
                  title: "The crop of each field",
                  description:
                    "The summer crop of every 30 m pixel, reduced to field outlines. 2020/21 to 2024/25 come from the INTA map, and 2025/26 from the team's model. Every crop says which.",
                },
                {
                  icon: Sprout,
                  title: "NDVI against the zone",
                  description:
                    "Monthly NDVI from September to May, and the gap between a field's peak and that of its neighbours with the same crop. It is vigor against neighbours, not a yield estimate.",
                },
                {
                  icon: Tag,
                  title: "Checked against INTA",
                  description:
                    "The served model agrees with the INTA map at about 0.86 in Pergamino and about 0.80 in Paraná, leaving one campaign out each time. That is agreement with another satellite product, not field truth.",
                },
              ],
              details: {
                title: "What the imagery does not do",
                rows: [
                  {
                    title: "Outlines are estimates",
                    description:
                      "Field outlines come from Fields of The World and are not validated in Argentina. They are not surveyed boundaries.",
                  },
                  {
                    title: "Paraná uses the Pergamino model",
                    description:
                      "Trained on its own labels, the model over-predicted maize in Paraná, so that zone is mapped with the model trained on Pergamino.",
                  },
                  {
                    title: "No flood maps",
                    description:
                      "Surface-water products were researched and are not in the app. No model of the team computes waterlogging, so none is shown.",
                  },
                  {
                    title: "Your own images",
                    description:
                      "Uploading your own images or boundaries is not part of this version.",
                  },
                ],
              },
              sources: [NASA_HLS_SOURCE, INTA_CROP_MAP_SOURCE, CROP_MAP_SOURCE],
            },
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
            summary: "What is not in this version yet",
            content: {
              headline: "What is not here yet.",
              lead: "This version ships what the pages of this site describe. This page names what is still missing, so nobody has to find it out during a demo.",
              preview: "limits",
              highlights: [
                {
                  icon: Waves,
                  title: "Excess water",
                  description:
                    "No model of the team computes waterlogging in a validated way. The water runs report water above the soil capacity, which is not flooding.",
                },
                {
                  icon: Sprout,
                  title: "Soil carbon and nitrogen",
                  description:
                    "Not modelled. Cover crops appear in the comparison, but the planner does not model them.",
                },
                {
                  icon: Compass,
                  title: "More regions with evidence",
                  description:
                    "Ten regions are listed. The water runs cover Pergamino, and the field maps cover Pergamino and Paraná. The other regions say not available.",
                },
              ],
              details: {
                title: "Next, and not claimed",
                rows: [
                  {
                    title: "Voice in the mobile app",
                    description:
                      "The assistant and its recorded voice work in the web app. The mobile app has no assistant screen, and continuous voice calls are not built.",
                  },
                  {
                    title: "Validation in the field",
                    description:
                      "The reference footprint and its rotation were not confirmed with a farmer. Reviewing the scenarios with agronomists is the next step.",
                  },
                  {
                    title: "More water indicators",
                    description:
                      "Dry spells, concentrated rainfall and river nitrate are proposals in the team's model notes. They are not built.",
                  },
                  {
                    title: "Devices and browsers",
                    description:
                      "Voice input was tested with synthetic speech in a desktop browser. Physical phones, Safari and the native app were not tested.",
                  },
                  {
                    title: "Planner runs are not stored",
                    description:
                      "Runs live in the memory of one server process, so a restart drops them.",
                  },
                ],
              },
            },
          },
          {
            pageSlug: "mcp-tools",
            title: "MCP tools",
            summary: "Four read-only tools for AI clients",
            content: {
              headline: "Open the evidence to any AI client.",
              lead: "Cropilot runs a public, read-only MCP server at /api/mcp. An AI client can list the cases, find analog years, compare rotations and read the evidence of a field, with sources, units and missing values kept.",
              preview: "source-trail",
              highlights: [
                {
                  icon: Plug,
                  title: "Four tools",
                  description:
                    "list_cases, find_analog_years, compare_rotations and get_field_evidence. All four are read-only, and each one declares it.",
                },
                {
                  icon: Layers,
                  title: "An interactive rotation card",
                  description:
                    "A host that supports MCP Apps can show a card for compare_rotations. Change soil depth, initial water and sowing shift, and inspect crop dates, stress and unmet water.",
                },
                {
                  icon: ShieldCheck,
                  title: "No key, no private data",
                  description:
                    "No login or API key. It serves the public demonstration evidence, runs no model and never reads a private farm.",
                },
              ],
              details: {
                title: "How to use it",
                rows: [
                  {
                    title: "Connect",
                    description:
                      "Any client with remote Streamable HTTP. Point it at the Cropilot origin plus /api/mcp, with no trailing slash.",
                  },
                  {
                    title: "Start with list_cases",
                    description:
                      "It lists the regions and what each one has. Only Pergamino includes water results. The other regions answer not available instead of borrowing another region's numbers.",
                  },
                  {
                    title: "Exact water selections",
                    description:
                      "Soil depth of 0.6 or 1.0 m with initial water of 25, 50 or 75%, and sowing shifts of 14 or 7 days earlier or later at 1.0 m and 50%. Other values are refused, not rounded.",
                  },
                  {
                    title: "Missing is not zero",
                    description:
                      "A null means the value is missing. Clients are asked to keep the decision date, units, scale and sources when they answer.",
                  },
                  {
                    title: "Scenarios, not forecasts",
                    description:
                      "Everything returned is a historical scenario. It is not a forecast, a yield prediction or a recommendation, and the agronomist keeps the call.",
                  },
                  {
                    title: "The assistant uses it too",
                    description:
                      "Ask Cropilot reads the same evidence, so an answer in the app and an answer from an AI client rest on the same numbers.",
                  },
                ],
              },
              sources: [CASE_BUNDLE_SOURCE, WATER_RUNS_SOURCE],
            },
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
            content: {
              headline: "Built for the agronomist who makes the call.",
              lead: "The brief speaks to producers, and the person who knows the field is the agronomist who advises them. Cropilot gives that advisor real campaigns, sourced numbers and the questions to check on the ground.",
              preview: "rotation-comparison",
              highlights: [
                {
                  icon: UserCheck,
                  title: "The decision stays yours",
                  description:
                    "Every screen says that Cropilot supports the agronomist's judgment and the producer's decision, and never replaces them.",
                },
                {
                  icon: ListChecks,
                  title: "What to check in the field",
                  description:
                    "Each strategy lists what only local knowledge can confirm: the water table and low areas, the water in the profile at sowing, and the sowing date and cycle.",
                },
                {
                  icon: BookOpen,
                  title: "No remote-sensing background needed",
                  description:
                    "Terms such as NDVI or soil wetness are explained in plain words, in the app and in the glossary.",
                },
              ],
              details: {
                title: "What an advisor gets",
                rows: [
                  {
                    title: "Years like this",
                    description:
                      "The real campaigns that started like the current one, by El Niño phase and soil water, each with its name and date.",
                  },
                  {
                    title: "Rotations side by side",
                    description:
                      "At least three rotations, the current one included, with five answers each: why, evidence, benefits, what is missing and which risks need local review.",
                  },
                  {
                    title: "A planner and an assistant",
                    description:
                      "The rotation planner shows how a policy fares against a fixed rotation. Ask Cropilot explains the evidence with its sources.",
                  },
                  {
                    title: "Where the checks come from",
                    description:
                      "The field checks of the strategies come from a consultation with Ing. Agr. MBA Fernando Spelanzon, named with his authorization.",
                  },
                ],
              },
            },
          },
          {
            pageSlug: "producers",
            title: "Producers and their advisors",
            summary: "A shared view for the producer and the agronomist.",
            content: {
              headline:
                "One view the producer and the advisor can read together.",
              lead: "Cropilot is made for the advisor, and its screens are written so the producer can follow. Both see the same campaigns, the same numbers and the same stated limits.",
              preview: "rotation-comparison",
              highlights: [
                {
                  icon: Handshake,
                  title: "A shared view",
                  description:
                    "The public case needs no sign-in, so an advisor can open it with the producer, side by side.",
                },
                {
                  icon: MessageSquare,
                  title: "Plain language",
                  description:
                    "Every strategy answers five questions in plain words, and the assistant can explain any table with its sources.",
                },
                {
                  icon: Scale,
                  title: "The producer's priorities",
                  description:
                    "In the planner, the weights on margin, water and bare soil are set by the people who know the farm, never chosen for them.",
                },
              ],
              details: {
                title: "What a producer can ask",
                rows: [
                  {
                    title: "What happened in years like this",
                    description:
                      "Which campaigns started alike, and how each rotation did in each of them.",
                  },
                  {
                    title: "What it costs in water",
                    description:
                      "How much crop water went unmet for each rotation, under the starting water and sowing date they choose.",
                  },
                  {
                    title: "What the margin looked like",
                    description:
                      "Gross margin with and without land rent. It describes the department, not one field.",
                  },
                  {
                    title: "What is not known",
                    description:
                      "Missing and assumed values are labelled. Cropilot does not hold the data of a given farm yet.",
                  },
                ],
              },
            },
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
            content: {
              headline: "Campaigns that start under El Niño.",
              lead: "The 2026/27 campaign starts under a strong El Niño: the July to September ONI of 2026 is +2.16, the highest since 1981. Cropilot finds the real campaigns that started in the same phase and shows what happened to each rotation.",
              preview: "analog-years",
              highlights: [
                {
                  icon: CalendarSearch,
                  title: "How a phase is set",
                  description:
                    "El Niño when the NOAA ONI is at or above +0.5, La Niña at or below -0.5, and neutral in between.",
                },
                {
                  icon: TrendingUpDown,
                  title: "On average, the good phase",
                  description:
                    "In the team's research El Niño is on average the favourable phase, and its damage is localised.",
                },
                {
                  icon: CloudRain,
                  title: "Where it hurt",
                  description:
                    "In 2015/16, 27% of the soybean planted in Paraná and 15% in Marcos Juárez was not harvested. The data show the area, not the cause.",
                },
              ],
              details: {
                title: "What Cropilot does with it",
                rows: [
                  {
                    title: "Real campaigns, not an average",
                    description:
                      "Each campaign that started under the same phase is shown with its name and date, next to the soil water it started with.",
                  },
                  {
                    title: "Excess water is an inference",
                    description:
                      "MAGyP reports the area not harvested, not why. No validated model of the team computes waterlogging, so the comparison shows it as not computed.",
                  },
                  {
                    title: "A phase read at decision time",
                    description:
                      "The phase is the one of the decision season, never the one of the summer that followed. See how the timing is handled in the data pages.",
                  },
                ],
              },
              sources: [NOAA_ONI_SOURCE, MAGYP_AREA_SOURCE],
            },
          },
          {
            pageSlug: "la-nina-campaigns",
            title: "La Niña campaigns",
            summary: "Campaigns that start under La Niña.",
            content: {
              headline: "Campaigns that start under La Niña.",
              lead: "On average La Niña is the phase that costs in the team's research. Cropilot lists the real campaigns that started that way, each with its name and date, instead of an average of them.",
              preview: "analog-years",
              highlights: [
                {
                  icon: TrendingUpDown,
                  title: "The costly phase, on average",
                  description:
                    "On average La Niña campaigns are the hard ones. An average hides the spread, so Cropilot shows each campaign.",
                },
                {
                  icon: CalendarClock,
                  title: "A dated example: 2022/23",
                  description:
                    "2022/23 was a La Niña campaign and had the worst yield anomaly of maize and wheat in Pergamino in 44 campaigns. In Río Cuarto maize fell from 5,500 to 3,900 kg/ha and soybean from 2,354 to 1,181.",
                },
                {
                  icon: Droplets,
                  title: "Soil water matters too",
                  description:
                    "2008/09 started in a neutral winter with dry soil and was one of the worst years. That is why Cropilot reads soil water next to the phase.",
                },
              ],
              details: {
                title: "Reading it right",
                rows: [
                  {
                    title: "A handful of campaigns",
                    description:
                      "There are few campaigns that start alike, so the count is always shown and percentiles are read with care.",
                  },
                  {
                    title: "Phase and soil water together",
                    description:
                      "The phase is one of two signals. The other is the root-zone soil water at the start of the campaign.",
                  },
                  {
                    title: "Not a forecast",
                    description:
                      "These are real campaigns of the past. They show a spread to weigh with local knowledge, and they do not predict the next one.",
                  },
                ],
              },
              sources: [NOAA_ONI_SOURCE, MAGYP_SOURCE, NASA_POWER_SOURCE],
            },
          },
          {
            pageSlug: "neutral-campaigns",
            title: "Neutral campaigns",
            summary: "Campaigns that start in a neutral phase.",
            content: {
              headline: "Campaigns that start in a neutral phase.",
              lead: "Neutral campaigns are matched with the same two signals: an ONI between -0.5 and +0.5, and the water in the soil at the start. Neutral does not mean average. 2008/09 started neutral with dry soil and was one of the worst years.",
              preview: "analog-years",
              highlights: [
                {
                  icon: CalendarSearch,
                  title: "A phase, not a safe year",
                  description:
                    "Neutral only says the ONI sits between -0.5 and +0.5. The campaign can still be dry or wet.",
                },
                {
                  icon: Droplets,
                  title: "Soil water is read beside it",
                  description:
                    "Two neutral campaigns can start with very different water in the soil, so Cropilot always reads both signals together.",
                },
                {
                  icon: CalendarClock,
                  title: "Real campaigns, listed",
                  description:
                    "Each matched campaign is shown with its name and date, and nothing is averaged away.",
                },
              ],
              details: {
                title: "In the app",
                rows: [
                  {
                    title: "The same rule everywhere",
                    description:
                      "The case and the planner both use the NOAA ONI with the same plus or minus 0.5 rule.",
                  },
                  {
                    title: "In the planner",
                    description:
                      "Neutral is one of the three phases of its decision process. The February to April 2026 ONI was +0.11, neutral, in the NOAA file the planner reads.",
                  },
                  {
                    title: "Not a forecast",
                    description:
                      "A neutral start does not say what the summer will bring. The page shows how past campaigns went.",
                  },
                ],
              },
              sources: [NOAA_ONI_SOURCE, NASA_POWER_SOURCE],
            },
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
            content: {
              headline: "Compare rotations by what they leave on the soil.",
              lead: "Cropilot does not give a soil health score. It shows what the simulator can measure, days of bare soil and rain falling on bare soil, and the cited reasoning of each strategy with what is missing.",
              preview: "rotation-comparison",
              highlights: [
                {
                  icon: Layers,
                  title: "Bare soil, counted",
                  description:
                    "The planner can weight days of bare soil and rain on bare soil, so a plan that keeps the soil covered can be preferred.",
                },
                {
                  icon: BookOpen,
                  title: "Cited previous-crop effects",
                  description:
                    "The maize, soybean, soybean strategy applies a cited previous-crop effect only to the soybean after maize. The cover-crop strategy cites its sources too.",
                },
                {
                  icon: Ban,
                  title: "Carbon is not modelled",
                  description:
                    "There is no soil carbon number anywhere in Cropilot. Where a benefit cannot be measured, the strategy lists it as missing information.",
                },
              ],
              details: {
                title: "What to know",
                rows: [
                  {
                    title: "The priority you set",
                    description:
                      "In the planner, the soil priority is a weight on bare soil outcomes, next to margin, water deficit and drainage.",
                  },
                  {
                    title: "Cover crops",
                    description:
                      "They appear in the comparison as a strategy. They have no water run, and the planner does not model them.",
                  },
                  {
                    title: "Local review",
                    description:
                      "What the soil of a given field needs is for the agronomist to confirm. The strategies say which risks need that review.",
                  },
                ],
              },
              sources: [PLANNER_SOURCE, CASE_BUNDLE_SOURCE],
            },
          },
          {
            pageSlug: "climate-resilience",
            title: "Climate resilience",
            summary: "Rotations compared across the campaigns like this one.",
            content: {
              headline:
                "See how each rotation held up in campaigns that started alike.",
              lead: "Resilience here is something you can read: how each rotation did in each of the analog campaigns, the worst one included, instead of one average.",
              preview: "rotation-comparison",
              highlights: [
                {
                  icon: TrendingUpDown,
                  title: "The worst year is on the page",
                  description:
                    "The planner reports a bad-year margin, the mean margin of the worst fifth of campaigns, next to the average.",
                },
                {
                  icon: Rows3,
                  title: "The order changes",
                  description:
                    "The rotation that leads changes from campaign to campaign. Where two rotations swap places, the page says so.",
                },
                {
                  icon: Scale,
                  title: "Held-out campaigns",
                  description:
                    "The planner replays every policy on campaigns it never saw, 2013/14 to 2024/25, and says when the result is inconclusive.",
                },
              ],
              details: {
                title: "What it is not",
                rows: [
                  {
                    title: "Not a risk score",
                    description:
                      "There is no single resilience number. You get the campaigns, the spread and the sources.",
                  },
                  {
                    title: "Heat is a screen",
                    description:
                      "The water runs count days above 35 °C and their overlap with water stress. It is not a validated damage function.",
                  },
                  {
                    title: "Few signals",
                    description:
                      "Besides soil water, the El Niño phase is the only signal the planner reads. Many regions show little gain over a good fixed rotation.",
                  },
                ],
              },
              sources: [MAGYP_SOURCE, NASA_POWER_SOURCE, NOAA_ONI_SOURCE],
            },
          },
          {
            pageSlug: "water-resilience",
            title: "Water resilience",
            summary: "Rotations compared by the water they leave in the soil.",
            content: {
              headline:
                "Compare rotations by the water they leave in the soil.",
              lead: "In the Pergamino water runs, each rotation is replayed over three campaigns with the soil water carried over day by day. Cropilot shows the crop water that went unmet, the water at sowing and the water at the end.",
              preview: "rotation-comparison",
              highlights: [
                {
                  icon: Droplets,
                  title: "Unmet crop water",
                  description:
                    "The gap between what the crop needed and what the soil gave, for each rotation and each starting campaign.",
                },
                {
                  icon: CalendarClock,
                  title: "Stress by crop stage",
                  description:
                    "Four stages per crop, from initial to late season. Their durations are fixed generic values, so mid-season does not mean observed flowering.",
                },
                {
                  icon: SlidersHorizontal,
                  title: "Tested against assumptions",
                  description:
                    "Soil depth, initial water and sowing date can be changed, to see how much the comparison depends on what is assumed.",
                },
              ],
              details: {
                title: "What to know",
                rows: [
                  {
                    title: "Excess is not flooding",
                    description:
                      "The runs report water above the soil capacity. No model of the team computes waterlogging.",
                  },
                  {
                    title: "One footprint",
                    description:
                      "The runs describe one reference footprint in Pergamino, not every field.",
                  },
                  {
                    title: "Counts, not probabilities",
                    description:
                      "The three-campaign episodes overlap, so the counts of lower, equal and higher deficit are descriptive. They are not calibrated probabilities.",
                  },
                ],
              },
              sources: [WATER_RUNS_SOURCE, SOILGRIDS_SOURCE],
            },
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
            content: {
              headline: "Built for Argentine farms.",
              lead: "Cropilot reads Argentine sources next to NASA's: the INTA crop maps, MAGyP yields and margins, and ten reference departments. The demo case is Pergamino in Buenos Aires, and Paraná in Entre Ríos has a field map.",
              preview: "farm-map",
              highlights: [
                {
                  icon: MapPinned,
                  title: "Ten reference departments",
                  description:
                    "After signing in you choose one of them, with Pergamino preselected. The planner and the assistant work on that region.",
                },
                {
                  icon: Database,
                  title: "Argentine data beside NASA's",
                  description:
                    "INTA crop maps, MAGyP department yields, areas and margins, and A3 futures prices sit beside NASA POWER and HLS.",
                },
                {
                  icon: CloudRain,
                  title: "A campaign that starts under El Niño",
                  description:
                    "2026/27 starts with a July to September ONI of +2.16, the highest since 1981. The case asks which past campaigns started like it.",
                },
              ],
              details: {
                title: "How far each region goes",
                rows: [
                  {
                    title: "Pergamino, in depth",
                    description:
                      "Years like this, the comparison, the water runs and the field map are all there for Pergamino.",
                  },
                  {
                    title: "Paraná",
                    description:
                      "A public case with its field map. Water results are not available for it, and the app says so.",
                  },
                  {
                    title: "Prices and costs",
                    description:
                      "Margins use A3 futures prices and MAGyP regional costs. The planner uses international price benchmarks and assumed costs.",
                  },
                ],
              },
              sources: [INTA_CROP_MAP_SOURCE, MAGYP_SOURCE, NASA_POWER_SOURCE],
            },
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
            content: {
              headline: "NOAA Oceanic Niño Index, the El Niño signal.",
              lead: "Cropilot reads the ONI to know whether a campaign started under El Niño, La Niña or neutral conditions. It is the first of the two signals that define a year like this one.",
              preview: "source-trail",
              highlights: [
                {
                  icon: CalendarSearch,
                  title: "Three phases",
                  description:
                    "El Niño at or above +0.5, La Niña at or below -0.5, and neutral in between. The case and the planner share that rule.",
                },
                {
                  icon: CalendarClock,
                  title: "Rolling three-month seasons",
                  description:
                    "A value per season from 1950 to today, for the Niño 3.4 region of the equatorial Pacific.",
                },
                {
                  icon: Info,
                  title: "Revised values",
                  description:
                    "Cropilot uses NOAA's revised historical values. This is the ONI, not the relative index RONI.",
                },
              ],
              details: {
                title: "Which season is read",
                rows: [
                  {
                    title: "In the case",
                    description:
                      "July to September of each campaign. NOAA publishes it in early October, and the screen says so.",
                  },
                  {
                    title: "In the planner",
                    description:
                      "February to April for the June decision and July to September for the August decision.",
                  },
                  {
                    title: "In the field map",
                    description:
                      "November to January of each summer, to tell which past summers shared a phase.",
                  },
                ],
              },
              sources: [NOAA_ONI_SOURCE],
            },
          },
          {
            pageSlug: "all-sources",
            title: "All sources and licenses",
            summary: "Every dataset Cropilot reads, with its license.",
            content: {
              headline: "Every dataset Cropilot reads.",
              lead: "NASA data sits at the centre of the reasoning, next to Argentine and open sources. Each one is listed with its period and place, and with its license where the team's register states one.",
              preview: "source-trail",
              highlights: [
                {
                  icon: Satellite,
                  title: "NASA data",
                  description:
                    "NASA POWER for daily weather and root-zone soil wetness, and NASA HLS imagery for crops and NDVI.",
                },
                {
                  icon: Database,
                  title: "Argentine data",
                  description:
                    "The INTA National Map of Crops and the MAGyP estimates are both CC BY 4.0. MAGyP margin reports and A3 futures prices feed the margins.",
                },
                {
                  icon: Globe,
                  title: "Open global data",
                  description:
                    "NOAA ONI, ISRIC SoilGrids 2.0 (CC BY 4.0) and Fields of The World outlines (CC BY 4.0).",
                },
              ],
              details: {
                title: "Also in the register",
                rows: [
                  {
                    title: "Prices",
                    description:
                      "A3 settlements and MATba workbooks are cited and not redistributed: the app carries only derived margins. The planner uses the World Bank Pink Sheet.",
                  },
                  {
                    title: "Agronomic references",
                    description:
                      "FAO-56 crop and evapotranspiration methods, INTA sowing dates and the published sources cited by each strategy.",
                  },
                  {
                    title: "AI models at runtime",
                    description:
                      "The assistant uses OpenAI models to explain evidence. They supply no data. See the Use of AI page.",
                  },
                  {
                    title: "The full list",
                    description:
                      "The team's register, submission.md in the hub repository, lists every dataset, library and AI tool with versions.",
                  },
                ],
              },
              sources: [
                NASA_POWER_SOURCE,
                NASA_HLS_SOURCE,
                NOAA_ONI_SOURCE,
                INTA_CROP_MAP_SOURCE,
                MAGYP_SOURCE,
                SOILGRIDS_SOURCE,
              ],
            },
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
            content: {
              headline: "How a year like this one is found.",
              lead: "Cropilot matches the current campaign to past ones with two signals: the El Niño phase from the NOAA ONI, and the root-zone soil water at the end of August from NASA POWER. The matches are real campaigns, shown one by one.",
              preview: "analog-years",
              highlights: [
                {
                  icon: CalendarSearch,
                  title: "Signal one: El Niño",
                  description:
                    "The July to September ONI of each campaign, since 1950.",
                },
                {
                  icon: Droplets,
                  title: "Signal two: soil water",
                  description:
                    "NASA POWER root-zone soil wetness for 22 to 31 August, since 1981.",
                },
                {
                  icon: Scale,
                  title: "Tested against climatology",
                  description:
                    "In the team's backward test, matching years performed about as well as plain climatology. The case says so.",
                },
              ],
              details: {
                title: "In Pergamino",
                rows: [
                  {
                    title: "The cloud",
                    description:
                      "Each of the 44 campaigns is a dot. The seven that started most like 2026/27 are highlighted, and 2026 sits outside the cloud.",
                  },
                  {
                    title: "Why show them one by one",
                    description:
                      "With seven campaigns, percentiles say little. Each campaign is named, dated and counted.",
                  },
                  {
                    title: "A cell, not a field",
                    description:
                      "NASA POWER describes a cell of about 55 × 57 km. The scale is stated beside every value.",
                  },
                ],
              },
              sources: [NASA_POWER_SOURCE, NOAA_ONI_SOURCE],
            },
          },
          {
            pageSlug: "decision-time",
            title: "Only what is known at decision time",
            summary: "Why the El Niño phase is never the one of the summer.",
            content: {
              headline: "Only what is known when the choice is made.",
              lead: "A year is matched with what a decision-maker could know at the time: the phase and the soil water at the decision, never the El Niño of the summer that followed.",
              preview: "analog-years",
              highlights: [
                {
                  icon: CalendarClock,
                  title: "A fixed decision date",
                  description:
                    "The case decides at the end of August, for the summer crop. The planner decides twice: wheat or fallow on 1 June, and the summer crop in late August.",
                },
                {
                  icon: Ban,
                  title: "Never the summer's phase",
                  description:
                    "The phase of the following summer is the answer to the question, so it never enters the match.",
                },
                {
                  icon: Flag,
                  title: "Stated on screen",
                  description:
                    "Where a signal arrives late, the app says when it is published.",
                },
              ],
              details: {
                title: "The limit you should know",
                rows: [
                  {
                    title: "The ONI arrives in October",
                    description:
                      "The July to September ONI is published in early October. For a decision at the end of August, the case reads it from NOAA's revised record, so the analog selection is retrospective.",
                  },
                  {
                    title: "In the planner",
                    description:
                      "June reads the February to April phase and August reads the July to September phase. The August decision does not see the soil water of August.",
                  },
                  {
                    title: "Soil water, as of the start",
                    description:
                      "The state keeps the water of the start of the campaign, so no later rain leaks into the choice.",
                  },
                ],
              },
              sources: [NOAA_ONI_SOURCE, NASA_POWER_SOURCE],
            },
          },
          {
            pageSlug: "limits",
            title: "Limits and assumptions",
            summary: "What the data can and cannot say about a field.",
            content: {
              headline: "What the data can and cannot say about a field.",
              lead: "Cropilot works with regional data, satellite estimates and simulated scenarios. This page lists what that means for any number you read, so the agronomist can weigh it against what they know about the field.",
              preview: "limits",
              highlights: [
                {
                  icon: Grid2x2,
                  title: "Scale",
                  description:
                    "Weather and soil wetness describe a cell of about 55 × 57 km. Yields and margins describe a department.",
                },
                {
                  icon: Satellite,
                  title: "Satellite, not ground",
                  description:
                    "Outlines and crops are estimates from imagery, and the crop map agrees with INTA's map, not with field records.",
                },
                {
                  icon: FileText,
                  title: "Scenarios, not forecasts",
                  description:
                    "Every water run and planner result is a simulated historical scenario. It is not a forecast and not a recommendation.",
                },
              ],
              details: {
                title: "The limits, one by one",
                rows: [
                  {
                    title: "A reference footprint",
                    description:
                      "The water runs describe one footprint in Pergamino, picked in the imagery and not validated with a farmer. Its rotation is the dominant mapped class, not a confirmed one.",
                  },
                  {
                    title: "Assumed values",
                    description:
                      "Soil depth, initial water and sowing dates are assumptions you can change. Generic crop stages need local review.",
                  },
                  {
                    title: "Vigor is not yield",
                    description:
                      "NDVI vigor compares a field with its neighbours under the same weather. It has not been checked against yields.",
                  },
                  {
                    title: "Excess water",
                    description:
                      "No validated model computes waterlogging. The runs report water above the soil capacity only.",
                  },
                  {
                    title: "The planner's interval",
                    description:
                      "It rests on 4 blocks of 3 held-out campaigns, which is coarse. It describes those 12 campaigns, not future ones.",
                  },
                  {
                    title: "Earlier research on learning agents",
                    description:
                      "In the team's first study, reinforcement-learning agents did not beat the best fixed rotation in any of 10 zones: -3 USD/ha/year, 95% CI -8 to +3.",
                  },
                  {
                    title: "The assistant",
                    description:
                      "It can make language errors even with sources. The tables it cites are the reference.",
                  },
                ],
              },
              sources: [NASA_POWER_SOURCE, CROP_MAP_SOURCE, RL_RESULT_SOURCE],
            },
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
            content: {
              headline: "What Cropilot does not do.",
              lead: "Cropilot does not forecast the weather, does not reduce a field to one score and does not replace the agronomist. It shows real past campaigns and says where its evidence ends.",
              preview: "limits",
              highlights: [
                {
                  icon: CloudRain,
                  title: "No weather forecast",
                  description:
                    "It looks back at campaigns that started alike. It does not predict the next summer.",
                },
                {
                  icon: Rows3,
                  title: "No single score",
                  description:
                    "There is no ranking number. You see the spread, campaign by campaign, with its sources.",
                },
                {
                  icon: UserCheck,
                  title: "No replacement",
                  description:
                    "It supports the judgment of the agronomist and the decision of the producer. The interface says so.",
                },
              ],
              details: {
                title: "Also not",
                rows: [
                  {
                    title: "Not a yield prediction",
                    description:
                      "Water runs and planner results are historical scenarios, not yield predictions or calibrated probabilities.",
                  },
                  {
                    title: "Not a flood forecast",
                    description:
                      "Water above the soil capacity is reported as that, and nothing more.",
                  },
                  {
                    title: "Not measured field water",
                    description:
                      "Soil depth and initial water are scenario assumptions, not measurements of a field.",
                  },
                  {
                    title: "Not field-validated",
                    description:
                      "The reference footprint and its rotation were not confirmed with a farmer.",
                  },
                ],
              },
            },
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
            content: {
              headline: "From the public case to your first planner run.",
              lead: "You can read a full case with no account. Sign in with Google to pick your region, run the rotation planner and ask Cropilot about a result.",
              preview: "analog-years",
              highlights: [
                {
                  icon: Compass,
                  title: "1 · Open a case",
                  description:
                    "No sign-in. Pergamino and Paraná are public. Read the years like this, compare rotations and look at the field map.",
                },
                {
                  icon: MapPinned,
                  title: "2 · Sign in, pick a region",
                  description:
                    "Sign in with Google, then choose one of the ten reference departments. Pergamino comes preselected, and you can change it later.",
                },
                {
                  icon: SlidersHorizontal,
                  title: "3 · Plan and ask",
                  description:
                    "Set your priorities and a horizon in the planner, watch the run, then ask Cropilot to explain the result with its sources.",
                },
              ],
              details: {
                title: "A good first pass",
                rows: [
                  {
                    title: "Start with years like this",
                    description:
                      "See which past campaigns started like the current one, and what each did.",
                  },
                  {
                    title: "Then compare",
                    description:
                      "Change the starting water, the soil depth and the sowing shift, and watch which strategy changes place.",
                  },
                  {
                    title: "Check the field",
                    description:
                      "Open a lot in the farm map, read the crop of every campaign and the reason for its status.",
                  },
                  {
                    title: "Keep the judgment",
                    description:
                      "Every strategy lists what to review locally. Read that part first.",
                  },
                ],
              },
              links: [
                {
                  label: "Open the Pergamino case",
                  description: "Public, no sign-in",
                  href: "/case/pergamino",
                },
                {
                  label: "Open the Paraná case",
                  description: "Public, no sign-in",
                  href: "/case/parana",
                },
              ],
            },
          },
          {
            pageSlug: "glossary",
            title: "Glossary",
            summary: "The terms Cropilot uses, in plain language.",
            content: {
              headline: "The terms Cropilot uses, in plain language.",
              lead: "No remote-sensing background is needed. These are the words you will meet in the app, in the order you will meet them.",
              preview: "source-trail",
              highlights: [
                {
                  icon: CloudRain,
                  title: "Climate",
                  description:
                    "ONI, El Niño, La Niña and neutral describe the sea-surface signal that sets the phase of a campaign.",
                },
                {
                  icon: Droplets,
                  title: "Soil and water",
                  description:
                    "Soil wetness, root zone, grid cell, unmet crop water and excess water describe what the soil holds and the crop receives.",
                },
                {
                  icon: FlaskConical,
                  title: "Method",
                  description:
                    "Analog year, held-out campaign, optimum and fixed rotation describe how the comparisons are made.",
                },
              ],
              details: {
                title: "Terms",
                rows: [
                  {
                    title: "ONI",
                    description:
                      "The Oceanic Niño Index of NOAA: a three-month running value for the Niño 3.4 region. At or above +0.5 is El Niño, at or below -0.5 is La Niña.",
                  },
                  {
                    title: "Campaign",
                    description:
                      "A growing season from June to May, written 25/26 for 2025/26.",
                  },
                  {
                    title: "Year like this",
                    description:
                      "A past campaign that started like the current one, by El Niño phase and soil water.",
                  },
                  {
                    title: "Root-zone soil wetness",
                    description:
                      "How wet the soil is where roots reach, from NASA POWER (GWETROOT). It is a regional estimate, not a field measurement.",
                  },
                  {
                    title: "Grid cell",
                    description:
                      "The area one NASA POWER value covers, about 55 × 57 km.",
                  },
                  {
                    title: "NDVI",
                    description:
                      "A greenness index from satellite imagery. Cropilot compares a field's NDVI with its neighbours with the same crop.",
                  },
                  {
                    title: "Unmet crop water",
                    description:
                      "The crop water demand minus what the crop actually used, from the water runs.",
                  },
                  {
                    title: "Excess above capacity",
                    description:
                      "Water beyond what the soil holds in the model. It is not flooding.",
                  },
                  {
                    title: "Held-out campaign",
                    description:
                      "A campaign kept out of training, used only to judge a policy. In the planner these are 2013/14 to 2024/25.",
                  },
                  {
                    title: "Optimum and fixed rotation",
                    description:
                      "The optimum is the exact best policy for your weights. A fixed rotation repeats the same cycle every campaign.",
                  },
                  {
                    title: "Q-learning",
                    description:
                      "A way for an agent to learn a policy by trial. The planner trains five and checks them against the exact optimum.",
                  },
                  {
                    title: "MCP",
                    description:
                      "The Model Context Protocol, a standard way for AI clients to call tools. Cropilot offers four read-only ones.",
                  },
                ],
              },
            },
          },
          {
            pageSlug: "faq",
            title: "Questions and answers",
            summary: "What agronomists ask first.",
            content: {
              headline: "What agronomists ask first.",
              lead: "Short answers, with the pages that hold the detail.",
              preview: "limits",
              highlights: [
                {
                  icon: CloudRain,
                  title: "Does it forecast?",
                  description:
                    "No. It shows real past campaigns that started like this one, and the spread between them.",
                },
                {
                  icon: UserCheck,
                  title: "Does it decide for me?",
                  description:
                    "No. It supports the agronomist's judgment and the producer's decision, and every strategy lists what to review locally.",
                },
                {
                  icon: Tag,
                  title: "Where do the numbers come from?",
                  description:
                    "Each indicator names its dataset, period and location. Assumed and missing values are labelled.",
                },
              ],
              details: {
                title: "More questions",
                rows: [
                  {
                    title: "Do I need an account?",
                    description:
                      "Not to read the public cases. The planner and the assistant on a planner run need a Google sign-in.",
                  },
                  {
                    title: "Is La Celina a real farm?",
                    description:
                      "No. The name is invented, and the app says so. Its 18 lots are real field outlines.",
                  },
                  {
                    title: "Can I use it on my own field?",
                    description:
                      "Not yet. The evidence is regional, and the water runs describe one reference footprint. Farms hold a name only for now.",
                  },
                  {
                    title: "Does the planner beat a fixed rotation?",
                    description:
                      "Sometimes, sometimes not. Against the best fixed rotation the result can be inconclusive, and the planner reports whatever it finds.",
                  },
                  {
                    title: "Can the assistant be wrong?",
                    description:
                      "Yes. It cites sources and shows evidence tables, but it is a language model. Check the tables.",
                  },
                  {
                    title: "Is there a mobile app?",
                    description:
                      "Yes, a companion app reads the same public case. The assistant and voice are web only.",
                  },
                ],
              },
            },
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
            content: {
              headline: "The people behind Cropilot.",
              lead: "Cropilot is built by a team for the NASA Space Apps Challenge 2026. These are the research areas each person leads in the team's working agreement.",
              preview: "source-trail",
              highlights: [
                {
                  icon: Layers,
                  title: "Core models",
                  description:
                    "Soil and climate: Joaquín Szterensus. Market: Tomás Benavidez. Water: Bruno De Cruz.",
                },
                {
                  icon: Scale,
                  title: "Strategies and imagery",
                  description:
                    "Reinforcement learning for rotation strategies: Martín Bianchi. Computer vision: Joaquín León.",
                },
                {
                  icon: BookOpen,
                  title: "Narrative and case",
                  description:
                    "Joaquín Cadeiras leads the narrative and the case.",
                },
              ],
              details: {
                title: "Who leads what",
                rows: [
                  {
                    title: "Joaquín Szterensus",
                    description:
                      "Core ML, soil and climate: the search for similar years, climate risk, soil parameters and carbon.",
                  },
                  {
                    title: "Tomás Benavidez",
                    description:
                      "Core ML, market: profit and market indicators.",
                  },
                  {
                    title: "Bruno De Cruz",
                    description:
                      "Core ML, water: the water balance by rotation.",
                  },
                  {
                    title: "Martín Bianchi",
                    description:
                      "Core, reinforcement learning: building and ranking rotation strategies.",
                  },
                  {
                    title: "Joaquín León",
                    description:
                      "Core, computer vision: maps and segmentation.",
                  },
                  {
                    title: "Joaquín Cadeiras",
                    description:
                      "Presentation: narrative and case, the part the jury sees.",
                  },
                ],
              },
            },
          },
          {
            pageSlug: "space-apps",
            title: "NASA Space Apps Challenge 2026",
            summary:
              "Cropilot answers the challenge Field Shift: Adapting Farms with NASA Data.",
            content: {
              headline: "Field Shift: Adapting Farms with NASA Data.",
              lead: "The challenge asks for a decision-support tool that uses NASA Earth observations with local soil, crop and producer information to explore rotation strategies that strengthen soil health and adapt farms to changing conditions. Cropilot is our answer, for Argentina.",
              preview: "rotation-comparison",
              highlights: [
                {
                  icon: Flag,
                  title: "The ask",
                  description:
                    "A rotation can improve soil in one place and use too much water, bring disease or miss the market in another. The tool has to show that trade-off.",
                },
                {
                  icon: ListChecks,
                  title: "What a good answer holds",
                  description:
                    "At least three strategies, the current one included. For each: why it is suggested, its evidence, benefits, missing information and risks that need local review.",
                },
                {
                  icon: UserCheck,
                  title: "A support, not a replacement",
                  description:
                    "The challenge asks that the tool not replace the producer's judgment or local experience. Cropilot is built for the agronomist who advises them.",
                },
              ],
              details: {
                title: "Where Cropilot stands",
                rows: [
                  {
                    title: "NASA data at the centre",
                    description:
                      "NASA POWER soil wetness defines the years like this one, and NASA HLS imagery gives the crop of each field.",
                  },
                  {
                    title: "Local inputs",
                    description:
                      "INTA crop maps, MAGyP yields and margins, SoilGrids and prices for Argentine regions.",
                  },
                  {
                    title: "Three or more rotations",
                    description:
                      "The comparison puts rotations side by side, the current one included, with the five answers for each.",
                  },
                  {
                    title: "How it is judged",
                    description:
                      "Impact, creativity, validity, relevance and presentation, each scored from 1 to 5. Validity is why every number names its source and every limit is stated.",
                  },
                ],
              },
              links: [
                {
                  label: "The official challenge page",
                  description: "NASA Space Apps Challenge 2026, Field Shift",
                  href: "https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/",
                },
              ],
            },
          },
          {
            pageSlug: "use-of-ai",
            title: "Use of AI",
            summary: "Where AI was used to build Cropilot.",
            content: {
              headline: "Where AI was used, and where it was not.",
              lead: "AI tools helped to build Cropilot, and one runs inside it. The team chose the problem, the zones and the approach. The full register is in the team's submission file; this is the short version.",
              preview: "limits",
              highlights: [
                {
                  icon: Code,
                  title: "Building",
                  description:
                    "Claude (Anthropic), Codex (OpenAI) and Gemini (Google) helped with research, code, tests, documentation and this site. Each use is listed with its tool and where it landed in the repositories.",
                },
                {
                  icon: MessageSquare,
                  title: "Running",
                  description:
                    "The assistant uses OpenAI models to explain existing evidence, transcribe a recorded question and read an excerpt aloud. They add no numbers of their own.",
                },
                {
                  icon: ShieldCheck,
                  title: "Marked",
                  description:
                    "The spoken excerpt is labelled as AI-generated. The line art of this site is vector geometry drawn in code, not a generated image.",
                },
              ],
              details: {
                title: "What the register says",
                rows: [
                  {
                    title: "Humans chose the direction",
                    description:
                      "AI listed options in some research steps, as context only. The team selected the years-like-this approach, the zones and the scope.",
                  },
                  {
                    title: "No model trained by the chatbot",
                    description:
                      "The assistant trained no agronomic model. Its numerical tables come from backend services, and its answers can contain language-model errors.",
                  },
                  {
                    title: "Negative results reported",
                    description:
                      "AI-assisted experiments that found no gain, such as risk-aware agents, are reported as inconclusive and were not retuned on the test data.",
                  },
                  {
                    title: "Checked by review",
                    description:
                      "Several parts, such as the assistant and the national experiments, were reviewed by a second AI agent, and the team checked results against papers, logs and data.",
                  },
                  {
                    title: "Sources checked",
                    description:
                      "Prior-art and crop-coefficient sweeps done by an AI tool were checked against their sources before use.",
                  },
                ],
              },
            },
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
            content: {
              headline: "Reach the people behind Cropilot.",
              lead: "The team works in the open under one GitHub organization. That is the way to reach us, and where the code and the research live.",
              preview: "source-trail",
              highlights: [
                {
                  icon: Mail,
                  title: "Through GitHub",
                  description:
                    "The organization HomoSapiens-NASA-Challenge holds every repository of the project.",
                },
                {
                  icon: Users,
                  title: "Who to ask",
                  description:
                    "The team page lists who leads each area, so a question about water or imagery can go to the right person.",
                },
                {
                  icon: Handshake,
                  title: "Agronomists welcome",
                  description:
                    "Cropilot is made to be reviewed by people who know the field. Local review is the next step the scenarios need.",
                },
              ],
              details: {
                title: "Where things are",
                rows: [
                  {
                    title: "cropilot",
                    description:
                      "The product: web app, mobile app, backend with the models, and sign-in.",
                  },
                  {
                    title: "simulator",
                    description:
                      "The rotation simulator and the Gymnasium environment for agents.",
                  },
                  {
                    title: "hub",
                    description:
                      "Context, conventions, research and the draft of the submission.",
                  },
                  {
                    title: "Access",
                    description: "The repositories are private for now.",
                  },
                ],
              },
              links: [
                {
                  label: "HomoSapiens-NASA-Challenge on GitHub",
                  description: "The organization of the team",
                  href: "https://github.com/HomoSapiens-NASA-Challenge",
                },
              ],
            },
          },
          {
            pageSlug: "source-code",
            title: "Source code",
            summary: "The code behind Cropilot.",
            content: {
              headline: "The code behind Cropilot.",
              lead: "Three repositories hold the product, the simulator and the research. Every dataset, library and AI tool they use is listed in the team's register.",
              preview: "source-trail",
              highlights: [
                {
                  icon: Code,
                  title: "cropilot",
                  description:
                    "A monorepo with the web app, the mobile app, the backend with its model modules, and sign-in.",
                },
                {
                  icon: FlaskConical,
                  title: "simulator",
                  description:
                    "The rotation simulator: a daily water balance, two decisions per campaign and ten reference fields.",
                },
                {
                  icon: BookOpen,
                  title: "hub",
                  description:
                    "The research, the conventions and the draft of the submission, including the register of sources.",
                },
              ],
              details: {
                title: "How the code is kept",
                rows: [
                  {
                    title: "No invented data",
                    description:
                      "Mock or synthetic values are named as such in the code and the interface. Every indicator carries its source.",
                  },
                  {
                    title: "No secrets or raw data",
                    description:
                      "Credentials, raw datasets and model weights are kept out of git. The assistant's key lives only on the server.",
                  },
                  {
                    title: "Reproducible pieces",
                    description:
                      "The crop map pipeline, the water scenarios and the case bundles each have a script or a pinned release behind them.",
                  },
                  {
                    title: "Access",
                    description: "The repositories are private for now.",
                  },
                ],
              },
              links: [
                {
                  label: "cropilot",
                  description: "Web, mobile, backend and sign-in",
                  href: "https://github.com/HomoSapiens-NASA-Challenge/cropilot",
                },
                {
                  label: "simulator",
                  description: "The rotation simulator",
                  href: "https://github.com/HomoSapiens-NASA-Challenge/simulator",
                },
                {
                  label: "hub",
                  description: "Research, conventions and the submission draft",
                  href: "https://github.com/HomoSapiens-NASA-Challenge/hub",
                },
              ],
            },
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
