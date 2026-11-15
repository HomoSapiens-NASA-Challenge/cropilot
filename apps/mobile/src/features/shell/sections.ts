import {
  CalendarSearch,
  LayoutDashboard,
  type LucideIcon,
  Map as MapIcon,
  Sprout,
} from "lucide-react-native"

export type AppSection = {
  title: string
  description: string
  href: "/overview" | "/map" | "/years" | "/strategies"
  icon: LucideIcon
  isAvailable: boolean
}
export const appSections = {
  overview: {
    title: "Overview",
    description:
      "How the 2026/27 campaign starts in your region and across Argentina.",
    href: "/overview",
    isAvailable: true,
    icon: LayoutDashboard,
  },
  farmMap: {
    title: "Farm map",
    description:
      "Lots outlined from satellite imagery, with their crops, NDVI and status. Select a lot to read it.",
    href: "/map",
    isAvailable: true,
    icon: MapIcon,
  },
  analogYears: {
    title: "Years like this",
    description:
      "Past campaigns that started like this one, matched by El Niño phase and soil moisture.",
    href: "/years",
    isAvailable: true,
    icon: CalendarSearch,
  },
  strategies: {
    title: "Strategies",
    description:
      "Crop rotations side by side, the current one included, in the campaigns that started like this one.",
    href: "/strategies",
    isAvailable: true,
    icon: Sprout,
  },
} as const satisfies Record<string, AppSection>
export const sectionGroups = [
  {
    label: "Workspace",
    sections: [
      appSections.overview,
      appSections.farmMap,
      appSections.analogYears,
      appSections.strategies,
    ],
  },
]
