import {
  BrainCircuit,
  CalendarSearch,
  LayoutDashboard,
  type LucideIcon,
  MapIcon,
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
    description:
      "How the 2026/27 campaign starts in your region and across Argentina.",
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
      "Lots outlined from satellite imagery, with their crops, NDVI and status. Select a lot to read it.",
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
    isAvailable: true,
  },
  strategies: {
    title: "Strategies",
    description:
      "Crop rotations side by side, the current one included, in the campaigns that started like this one.",
    to: "/strategies",
    icon: Sprout,
    isAvailable: true,
  },
  rotationPlanner: {
    title: "Rotation planner",
    description:
      "Set what matters on this farm. The simulator, an exact solver and a learning agent search for the best rotation, then replay it on past campaigns.",
    to: "/planner",
    icon: BrainCircuit,
    isAvailable: true,
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
      appSections.rotationPlanner,
    ],
  },
]
