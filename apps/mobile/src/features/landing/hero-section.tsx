import { Text as InlineText, View } from "react-native"
import { Text } from "@/components/ui/text"
import { AppEntryLink, CtaLink } from "@/features/landing/cta-link"
import { HeroWash } from "@/features/landing/decor"
import { Band, SplitHeading } from "@/features/landing/frame"
import { useGoToAnchor } from "@/features/landing/site-scroll"

export function HeroSection() {
  const goToAnchor = useGoToAnchor()
  return (
    <Band className="relative overflow-hidden">
      <HeroWash />
      <View className="items-start gap-10 px-4 pt-24 pb-28">
        <Text className="text-sm font-medium">
          Evidence for the agronomist,{" "}
          <InlineText className="font-normal text-muted-foreground">
            not a forecast
          </InlineText>
        </Text>
        <SplitHeading
          lead="Plan rotations with the years that looked like this one."
          className="text-3xl leading-9"
        >
          Cropilot finds the past campaigns that started like the current one,
          by El Niño phase and soil moisture, and shows how each crop rotation
          did in them.
        </SplitHeading>
        <View className="flex-row flex-wrap items-center gap-2">
          <AppEntryLink signedOutLabel="Get started" />
          <CtaLink
            label="See how it works"
            variant="outline"
            onPress={() => goToAnchor("how-it-works")}
          />
        </View>
      </View>
    </Band>
  )
}
