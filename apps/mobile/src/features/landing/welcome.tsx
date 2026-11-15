import { router } from "expo-router"
import { Menu, MessageCircle } from "lucide-react-native"
import { useState } from "react"
import { Text as InlineText, Pressable, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { BrandMark } from "@/components/brand-mark"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { AppEntryLink, CtaLink } from "@/features/landing/cta-link"
import { HeroWash } from "@/features/landing/decor"
import { findSitePage } from "@/features/landing/site-content"
import { openSitePage } from "@/features/landing/site-links"
import { SiteMobileNav } from "@/features/landing/site-mobile-nav"

const features = [
  {
    pageSlug: "years-like-this",
    title: "Find the campaigns that started like this one",
  },
  { pageSlug: "rotation-strategies", title: "Compare three or more rotations" },
  { pageSlug: "evidence-trail", title: "Every number names its source" },
  { pageSlug: "farm-map", title: "See every farm, lot by lot" },
  { pageSlug: "assistant", title: "Ask, and get answers that cite their data" },
]

export function Welcome() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      className="flex-1 bg-background"
    >
      <HeroWash />
      <View className="h-16 flex-row items-center justify-between px-6">
        <BrandMark />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open menu"
          onPress={() => setIsMenuOpen(true)}
          className="size-10 items-center justify-center rounded-lg active:bg-muted"
        >
          <Icon as={Menu} size={18} className="text-foreground" />
        </Pressable>
      </View>
      <SiteMobileNav open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <ScrollView className="flex-1" contentContainerClassName="pt-6">
        <View className="px-6">
          <Text className="text-sm font-medium">
            Evidence for the agronomist,{" "}
            <InlineText className="font-normal text-muted-foreground">
              not a forecast
            </InlineText>
          </Text>
          <Text className="mt-4 text-3xl font-light leading-9 tracking-tight text-foreground">
            Plan rotations with the years that looked like this one.
          </Text>
          <Text className="mt-3 text-base leading-6 text-muted-foreground">
            Cropilot finds the past campaigns that started like the current one,
            by El Niño phase and soil moisture, and shows how each crop rotation
            did in them.
          </Text>
          <Text className="mt-7 text-sm font-medium">
            One view for the whole decision.
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={252}
          decelerationRate="fast"
          contentContainerClassName="gap-3 px-6 pt-3"
        >
          {features.map(({ pageSlug, title }) => {
            const page = findSitePage("features", pageSlug)?.page
            if (!page) throw new Error(`Missing feature page: ${pageSlug}`)
            const PageIcon = page.content?.highlights[0]?.icon ?? MessageCircle
            return (
              <Pressable
                key={pageSlug}
                accessibilityRole="link"
                accessibilityLabel={`Open ${title}`}
                onPress={() => openSitePage("features", pageSlug)}
                className="w-60 gap-3 rounded-xl border border-border bg-card p-4"
              >
                <View className="size-9 items-center justify-center rounded-lg bg-accent">
                  <Icon as={PageIcon} size={18} className="text-primary" />
                </View>
                <Text className="text-base font-medium leading-5">{title}</Text>
                <Text className="text-sm text-muted-foreground">
                  {page.summary}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </ScrollView>
      <View className="gap-3 border-t border-border/70 bg-background px-6 pt-4 pb-6">
        <AppEntryLink signedOutLabel="Get started" className="self-stretch" />
        <CtaLink
          label="See how it works"
          variant="outline"
          className="self-stretch"
          onPress={() =>
            router.push({
              pathname: "/tour",
              params: { section: "how-it-works", at: String(Date.now()) },
            })
          }
        />
      </View>
    </SafeAreaView>
  )
}
