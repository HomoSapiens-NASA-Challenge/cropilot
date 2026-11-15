import {
  CalendarSearch,
  LayoutDashboard,
  type LucideIcon,
  Map as MapIcon,
  MessagesSquare,
  Satellite,
  Sprout,
} from "lucide-react-native"

export type AppSection = {
  title: string
  description: string
  href:
    | "/overview"
    | "/map"
    | "/fields"
    | "/analog-years"
    | "/strategies"
    | "/assistant"
  icon: LucideIcon
  isAvailable: boolean
}

export const appSections = {
  overview: {
    title: "Overview",
    description: "Your workspace at a glance.",
    href: "/overview",
    isAvailable: true,
    icon: LayoutDashboard,
  },
  farmMap: {
    title: "Farm map",
    description:
      "Demo farms on the map. Tap a lot to inspect it, open a farm to see its data.",
    href: "/map",
    isAvailable: true,
    icon: MapIcon,
  },
  fieldFootprints: {
    title: "Field footprints",
    description:
      "Satellite-estimated field footprints in the Pergamino study window, with their crop history, greenness, soil and water data.",
    href: "/fields",
    isAvailable: true,
    icon: Satellite,
  },
  analogYears: {
    title: "Years like this",
    description:
      "Past campaigns that started like this one, matched by El Niño phase and soil moisture.",
    href: "/analog-years",
    isAvailable: false,
    icon: CalendarSearch,
  },
  strategies: {
    title: "Strategies",
    description:
      "At least three crop rotations side by side, the current one included.",
    href: "/strategies",
    isAvailable: false,
    icon: Sprout,
  },
  assistant: {
    title: "Assistant",
    description:
      "Ask about a strategy and get answers that cite their dataset, period and location.",
    href: "/assistant",
    isAvailable: false,
    icon: MessagesSquare,
  },
} as const satisfies Record<string, AppSection>

export const sectionGroups = [
  {
    label: "Workspace",
    sections: [
      appSections.overview,
      appSections.farmMap,
      appSections.fieldFootprints,
    ],
  },
  {
    label: "Analysis",
    sections: [
      appSections.analogYears,
      appSections.strategies,
      appSections.assistant,
    ],
  },
]
