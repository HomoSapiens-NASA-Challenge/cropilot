import {
  Droplets,
  FileSearch,
  type LucideIcon,
  Waves,
} from "lucide-react-native"
import { View } from "react-native"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { CtaLink } from "@/features/landing/cta-link"
import { Band, SplitHeading } from "@/features/landing/frame"
import { openSitePage } from "@/features/landing/site-links"

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
    <Band tone="inverse">
      <View className="items-start gap-8 px-4 pt-20 pb-14">
        <SplitHeading
          tone="inverse"
          lead="NASA Earth data at the center of every comparison."
        >
          Two signals known when the decision is made define what a similar year
          is. Everything shown can be traced back to them.
        </SplitHeading>
        <View className="flex-row flex-wrap gap-2">
          <CtaLink
            label="Read about the data"
            withChevron
            onPress={() => openSitePage("data", "nasa-power")}
          />
          <CtaLink
            label="How similar years are found"
            variant="inverse"
            onPress={() => openSitePage("data", "similar-years")}
          />
        </View>
      </View>
      <View className="gap-4 px-4 pb-20">
        {SOURCES.map((source) => (
          <View
            key={source.title}
            className="gap-3 rounded-xl border border-inverse-foreground/10 bg-inverse-foreground/5 p-6"
          >
            <Icon as={source.icon} size={20} className="text-highlight" />
            <Text className="mt-2 text-xs uppercase tracking-wide text-inverse-muted-foreground">
              {source.provider}
            </Text>
            <Text className="text-lg font-medium text-inverse-foreground">
              {source.title}
            </Text>
            <Text className="leading-relaxed text-inverse-muted-foreground">
              {source.description}
            </Text>
          </View>
        ))}
      </View>
    </Band>
  )
}
