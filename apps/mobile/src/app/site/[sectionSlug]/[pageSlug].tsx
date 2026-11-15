import { router, useLocalSearchParams } from "expo-router"
import { View } from "react-native"
import { Text } from "@/components/ui/text"
import { ArrowLink } from "@/features/landing/cta-link"
import { findSitePage } from "@/features/landing/site-content"
import { SitePageView } from "@/features/landing/site-page"
import { SiteScreen } from "@/features/landing/site-screen"

export default function SitePageRoute() {
  const { sectionSlug, pageSlug } = useLocalSearchParams<{
    sectionSlug: string
    pageSlug: string
  }>()
  const match = findSitePage(sectionSlug, pageSlug)

  return (
    <SiteScreen>
      {match ? (
        <SitePageView
          menu={match.menu}
          column={match.column}
          page={match.page}
        />
      ) : (
        <View className="gap-4 px-4 py-20">
          <Text>This page does not exist.</Text>
          <ArrowLink label="Back home" onPress={() => router.replace("/")} />
        </View>
      )}
    </SiteScreen>
  )
}
