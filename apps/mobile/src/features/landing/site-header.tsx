import { router } from "expo-router"
import { Menu } from "lucide-react-native"
import { useState } from "react"
import { Pressable, View } from "react-native"
import { BrandMark } from "@/components/brand-mark"
import { Icon } from "@/components/ui/icon"
import { AppEntryLink } from "@/features/landing/cta-link"
import { SiteMobileNav } from "@/features/landing/site-mobile-nav"
import { SITE_HEADER_HEIGHT } from "@/features/landing/site-scroll"

/** Sticky header of the public site, as the web shows it below `lg`. */
export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <View className="border-b border-border/70 bg-background/95 px-2">
      <View
        className="flex-row items-center gap-4 px-4"
        style={{ height: SITE_HEADER_HEIGHT }}
      >
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Cropilot home"
          onPress={() => router.navigate("/")}
          className="mr-2 rounded-lg"
        >
          <BrandMark />
        </Pressable>
        <View className="ml-auto flex-row items-center gap-2">
          <AppEntryLink signedOutLabel="Get started" size="compact" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            onPress={() => setIsMenuOpen(true)}
            className="size-10 items-center justify-center rounded-lg active:bg-muted"
          >
            <Icon as={Menu} size={18} className="text-foreground" />
          </Pressable>
        </View>
      </View>
      <SiteMobileNav open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </View>
  )
}
