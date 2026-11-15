import {
  CalendarSearch,
  LayoutDashboard,
  type LucideIcon,
  MapIcon,
  MessagesSquare,
  Sprout,
  Tractor,
} from "lucide-react"

type AppSectionDefinition = {
  title: string
  description: string
  to: string
  icon: LucideIcon
  isAvailable: boolean
}

/** Every section of the signed-in app: navigation, breadcrumbs and page headers read from here. */
export const appSections = {
  overview: {
    title: "Overview",
    description: "Your workspace at a glance.",
    to: "/overview",
    icon: LayoutDashboard,
    isAvailable: true,
  },
  farms: {
    title: "Farms",
    description:
      "The farms you advise. Every comparison starts from one of them.",
    to: "/farms",
    icon: Tractor,
    isAvailable: true,
  },
  farmMap: {
    title: "Farm map",
    description:
      "Demo farms on the map. Hover a lot to inspect it, open a farm to see its data.",
    to: "/map",
    icon: MapIcon,
    isAvailable: true,
  },
  analogYears: {
    title: "Years like this",
    description:
      "Past campaigns that started like this one, matched by El Niño phase and soil moisture.",
    to: "/analog-years",
    icon: CalendarSearch,
    isAvailable: false,
  },
  strategies: {
    title: "Strategies",
    description:
      "At least three crop rotations side by side, the current one included.",
    to: "/strategies",
    icon: Sprout,
    isAvailable: false,
  },
  assistant: {
    title: "Assistant",
    description:
      "Ask about a strategy and get answers that cite their dataset, period and location.",
    to: "/assistant",
    icon: MessagesSquare,
    isAvailable: false,
  },
} as const satisfies Record<string, AppSectionDefinition>

export type AppSection = (typeof appSections)[keyof typeof appSections]

export const sectionGroups: ReadonlyArray<{
  label: string
  sections: ReadonlyArray<AppSection>
}> = [
  {
    label: "Workspace",
    sections: [appSections.overview, appSections.farms, appSections.farmMap],
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
