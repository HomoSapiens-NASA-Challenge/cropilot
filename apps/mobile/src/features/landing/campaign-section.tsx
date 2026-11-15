import { View } from "react-native"
import { StrandsArt } from "@/components/strands-art"
import { Text } from "@/components/ui/text"
import { CtaLink } from "@/features/landing/cta-link"
import { Band } from "@/features/landing/frame"
import { openSitePage } from "@/features/landing/site-links"

export function CampaignSection() {
  return (
    <Band>
      <View className="px-4 py-20">
        <View className="relative min-h-96 items-start justify-between gap-10 overflow-hidden rounded-xl bg-inverse p-8">
          <StrandsArt tone="inverse" className="absolute inset-0 opacity-40" />
          <Text className="text-4xl font-light leading-[44px] tracking-tight text-inverse-foreground">
            Plan the 2026/27 campaign with the years that started like it
          </Text>
          <CtaLink
            label="See years like this"
            variant="light"
            withChevron
            onPress={() => openSitePage("features", "years-like-this")}
          />
        </View>
      </View>
    </Band>
  )
}
