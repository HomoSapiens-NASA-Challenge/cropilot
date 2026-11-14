export type TabPath =
  | "/dashboard"
  | "/dashboard/field"
  | "/dashboard/strategies"
  | "/dashboard/region"
  | "/dashboard/evidence"

/**
 * Platform tabs, in order of importance. Tabs without data yet render a placeholder
 * that says which model feeds them and what is still missing, so nobody mistakes an
 * empty tab for a broken one.
 */
export interface Feed {
  model: string
  owner: string
  output: string
  status: string
}

export interface Tab {
  to: TabPath
  label: string
  question: string
  feeds?: Feed[]
  /** The bundle file the pipeline will write for this tab. */
  bundle?: string
}

export const TABS: Tab[] = [
  {
    to: "/dashboard",
    label: "This season",
    question:
      "How does this season start, and how did each strategy do in seasons that started alike?",
  },
  {
    to: "/dashboard/field",
    label: "Field",
    question:
      "What is this field: its rotation history, green cover and surface water?",
    bundle: "field.json",
    feeds: [
      {
        model: "Computer vision on Sentinel-2 / HLS",
        owner: "Joaquín L.",
        output:
          "Field boundary, crop history by season, green cover with quality mask",
        status: "Research done, no pipeline yet",
      },
      {
        model: "Surface water (NASA OPERA DSWx)",
        owner: "Joaquín L.",
        output: "Water on the surface by date, since 2016",
        status: "Source checked",
      },
      {
        model: "Soil parameters (SoilGrids)",
        owner: "Joaquín S.",
        output: "Texture, organic carbon, field capacity and wilting point",
        status: "Source checked",
      },
    ],
  },
  {
    to: "/dashboard/strategies",
    label: "Strategies",
    question:
      "What if I sow later or swap a crop? Day-by-day soil water for each strategy in each similar season.",
    bundle: "strategies.json",
    feeds: [
      {
        model: "Water balance and yield simulator (FAO-56)",
        owner: "Martín, Bruno",
        output: "Daily soil water, deficit and excess per strategy and season",
        status: "Engine in research/rl/lab; simulator repo is empty",
      },
      {
        model: "Candidate generator (RL)",
        owner: "Martín",
        output:
          "Suggested strategies to compare. Matches a simple rule; not shown as a winner",
        status: "Research",
      },
      {
        model: "Margins (A3 futures, MAGyP costs)",
        owner: "Tomás",
        output: "Margin per strategy in each similar season",
        status: "Computed for Pergamino",
      },
    ],
  },
  {
    to: "/dashboard/region",
    label: "Region",
    question: "Where in Argentina does El Niño or La Niña hit, and how hard?",
    bundle: "region.json",
    feeds: [
      {
        model: "National runs, 250 departments",
        owner: "Martín",
        output:
          "Maps by objective, trade-offs, early-warning skill by province",
        status: "Figures and CSVs, not yet a bundle",
      },
      {
        model: "ENSO by zone, 10 zones",
        owner: "Joaquín S., Tomás",
        output: "Rain, yield and unharvested area by El Niño phase",
        status: "Tables in the research",
      },
    ],
  },
  {
    to: "/dashboard/evidence",
    label: "Evidence",
    question:
      "Where does each number come from, how well was each model validated, and what is missing?",
  },
]

/** Model cards for the Evidence tab: what was validated and how. Text from the hub research. */
export const MODEL_CARDS: Array<{
  name: string
  owner: string
  result: string
  status: "research" | "used"
}> = [
  {
    name: "Similar-season finder",
    owner: "Joaquín S.",
    result:
      "Rule-based: El Niño or La Niña known by May–Jul, soil wetness for neutral starts. Tested in Pergamino only.",
    status: "used",
  },
  {
    name: "Water and heat forecasts by zone",
    owner: "Bruno",
    result:
      "Beats climatology by 0.4–11% on 2013–2024 test seasons; every 95% interval includes zero. Research only.",
    status: "research",
  },
  {
    name: "Yield model from NASA POWER",
    owner: "Tomás",
    result:
      "17–24% better than the yield trend, validated leaving one season out, 10 departments.",
    status: "research",
  },
  {
    name: "Early warning of bad years",
    owner: "Martín",
    result:
      "At June 1 the skill is close to chance (AUC 0.51); with December weather it rises to 0.57.",
    status: "research",
  },
]
