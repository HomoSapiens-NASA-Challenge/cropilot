import { router } from "expo-router"
import { View } from "react-native"
import { StrandsArt } from "@/components/strands-art"
import { Text } from "@/components/ui/text"
import { CtaLink } from "@/features/landing/cta-link"
import { Band } from "@/features/landing/frame"
import { REFERENCE_CASE_ZONE_ID } from "@/features/landing/reference-case"

export function CampaignSection() {
  return (
    <Band>
      <View className="px-4 py-20">
        <View className="relative min-h-96 items-start justify-between gap-10 overflow-hidden rounded-xl bg-inverse p-8">
          <StrandsArt tone="inverse" className="absolute inset-0 opacity-40" />
          <View className="gap-4">
            <Text className="text-4xl font-light leading-[44px] tracking-tight text-inverse-foreground">
              Plan the 2026/27 campaign with the years that started like it
            </Text>
            <Text className="text-inverse-muted-foreground">
              ONI for July to September 2026 is +2.16, above every campaign
              since 1981. Source: NOAA Oceanic Niño Index.
            </Text>
          </View>
          <CtaLink
            label="Open the 2026/27 case"
            variant="light"
            withChevron
            onPress={() =>
              router.push({
                pathname: "/case/[zoneId]",
                params: { zoneId: REFERENCE_CASE_ZONE_ID },
              })
            }
          />
        </View>
      </View>
    </Band>
  )
}
