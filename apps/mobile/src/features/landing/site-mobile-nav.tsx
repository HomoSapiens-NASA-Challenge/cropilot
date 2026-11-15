import { router } from "expo-router"
import { X } from "lucide-react-native"
import { Modal, Pressable, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { BrandMark } from "@/components/brand-mark"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { CtaLink } from "@/features/landing/cta-link"
import { SITE_MENUS } from "@/features/landing/site-content"
import { openSitePage } from "@/features/landing/site-links"

/** The same menus as the web's navigation, stacked in a side sheet. */
export function SiteMobileNav({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 flex-row">
        <Pressable
          accessibilityLabel="Close menu"
          onPress={onClose}
          className="flex-1 bg-foreground/20"
        />
        <SafeAreaView
          edges={["top", "bottom", "right"]}
          className="w-4/5 max-w-sm border-l border-border bg-popover"
        >
          <View className="flex-row items-center justify-between p-4">
            <BrandMark />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close menu"
              onPress={onClose}
              className="size-11 items-center justify-center rounded-lg active:bg-muted"
            >
              <Icon as={X} size={16} className="text-muted-foreground" />
            </Pressable>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerClassName="gap-8 px-4 pt-2 pb-8"
          >
            {SITE_MENUS.map((menu) => (
              <View key={menu.sectionSlug} className="gap-3">
                <Text className="border-b border-border pb-2 text-sm text-muted-foreground">
                  {menu.label}
                </Text>
                {menu.columns
                  .flatMap((column) => column.pages)
                  .map((page) => (
                    <Pressable
                      key={page.pageSlug}
                      accessibilityRole="link"
                      onPress={() => {
                        onClose()
                        openSitePage(menu.sectionSlug, page.pageSlug)
                      }}
                    >
                      <Text className="text-base text-foreground">
                        {page.title}
                      </Text>
                    </Pressable>
                  ))}
              </View>
            ))}
          </ScrollView>
          <View className="border-t border-border p-4">
            <CtaLink
              label="Get started"
              withChevron
              className="self-stretch"
              onPress={() => {
                onClose()
                router.push("/sign-in")
              }}
            />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  )
}
