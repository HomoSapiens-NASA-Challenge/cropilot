import { Database, type LucideIcon, Tractor } from "lucide-react-native"
import { View } from "react-native"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { AppEntryLink, ArrowLink, CtaLink } from "@/features/landing/cta-link"
import { Band } from "@/features/landing/frame"
import { openSitePage } from "@/features/landing/site-links"
import { useGoToAnchor } from "@/features/landing/site-scroll"

const NEXT_STEPS: ReadonlyArray<{
  icon: LucideIcon
  title: string
  description: string
  linkLabel: string
  sectionSlug: string
  pageSlug: string
}> = [
  {
    icon: Database,
    title: "See what it reads",
    description:
      "Two open signals: soil water from NASA POWER and the NOAA Oceanic Niño Index.",
    linkLabel: "About the data",
    sectionSlug: "data",
    pageSlug: "nasa-power",
  },
  {
    icon: Tractor,
    title: "Start from a farm",
    description:
      "Every comparison starts from a field and the rotation it runs today.",
    linkLabel: "Farm map",
    sectionSlug: "features",
    pageSlug: "farm-map",
  },
]

export function ClosingSection() {
  const goToAnchor = useGoToAnchor()
  return (
    <Band tone="tinted" frameClassName="border-t">
      <View className="gap-14 px-4 py-20">
        <View className="items-start gap-5">
          <Text role="heading" className="text-3xl font-light tracking-tight">
            Ready to get started?
          </Text>
          <Text className="text-xl font-light text-muted-foreground">
            Type your name and add your first farm.
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <AppEntryLink signedOutLabel="Start now" />
            <CtaLink
              label="See how it works"
              variant="outline"
              onPress={() => goToAnchor("how-it-works")}
            />
          </View>
        </View>
        <View className="gap-10">
          {NEXT_STEPS.map((step) => (
            <View key={step.title} className="items-start gap-3">
              <View className="size-10 items-center justify-center rounded-lg border border-border bg-background">
                <Icon as={step.icon} size={20} className="text-primary" />
              </View>
              <Text className="mt-2 font-medium">{step.title}</Text>
              <Text className="text-muted-foreground">{step.description}</Text>
              <ArrowLink
                label={step.linkLabel}
                onPress={() => openSitePage(step.sectionSlug, step.pageSlug)}
              />
            </View>
          ))}
        </View>
      </View>
    </Band>
  )
}
