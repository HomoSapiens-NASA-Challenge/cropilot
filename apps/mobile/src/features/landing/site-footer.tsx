import { router } from "expo-router"
import { Pressable, View } from "react-native"
import { BrandMark } from "@/components/brand-mark"
import { Text } from "@/components/ui/text"
import { ArrowLink } from "@/features/landing/cta-link"
import { DashedRule } from "@/features/landing/decor"
import { Band } from "@/features/landing/frame"
import { SITE_MENUS } from "@/features/landing/site-content"
import { openSitePage } from "@/features/landing/site-links"

export function SiteFooter() {
  return (
    <Band tone="tinted" frameClassName="border-t">
      {/* Two columns on a phone; the web stacks one per row below `sm`. */}
      <View className="flex-row flex-wrap">
        {SITE_MENUS.map((menu) => (
          <View
            key={menu.sectionSlug}
            accessibilityLabel={menu.label}
            className="w-1/2 gap-4 px-4 py-10"
          >
            <Text className="text-sm font-medium">{menu.label}</Text>
            <View className="gap-2">
              {menu.columns
                .flatMap((column) => column.pages)
                .map((page) => (
                  <Pressable
                    key={page.pageSlug}
                    accessibilityRole="link"
                    onPress={() =>
                      openSitePage(menu.sectionSlug, page.pageSlug)
                    }
                  >
                    <Text className="text-sm text-muted-foreground">
                      {page.title}
                    </Text>
                  </Pressable>
                ))}
            </View>
          </View>
        ))}
      </View>
      <DashedRule />
      <View className="gap-6 px-4 py-8">
        <View className="items-start gap-3">
          <BrandMark />
          <Text className="text-sm text-muted-foreground">
            Built for the NASA Space Apps Challenge 2026 · Field Shift: Adapting
            Farms with NASA Data. Cropilot supports the agronomist's judgment
            and never replaces it.
          </Text>
        </View>
        <ArrowLink
          label="Sign in"
          className="text-sm"
          onPress={() => router.push("/sign-in")}
        />
      </View>
    </Band>
  )
}
