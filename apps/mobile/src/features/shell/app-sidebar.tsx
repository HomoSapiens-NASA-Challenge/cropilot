import { router, usePathname } from "expo-router"
import { ChevronsUpDown, LogOut } from "lucide-react-native"
import { useState } from "react"
import { Modal, Pressable, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { BrandLogo } from "@/components/brand-mark"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { sectionGroups } from "@/features/shell/sections"
import { cn } from "@/lib/utils"

export function AppSidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 flex-row">
        <Pressable
          accessibilityLabel="Close navigation"
          accessibilityRole="button"
          className="absolute inset-0 bg-foreground/20"
          onPress={onClose}
        />
        <SafeAreaView className="h-full w-72 border-r border-sidebar-border bg-sidebar">
          <Pressable
            accessibilityRole="button"
            className="m-2 flex-row items-center gap-2 rounded-lg p-2"
            onPress={() => {
              router.navigate("/overview")
              onClose()
            }}
          >
            <BrandLogo />
            <View>
              <Text className="font-medium tracking-tight text-foreground">
                Cropilot
              </Text>
              <Text className="text-xs text-sidebar-foreground">
                Rotation planning
              </Text>
            </View>
          </Pressable>
          <View className="flex-1 gap-4 px-2">
            {sectionGroups.map((group) => (
              <View key={group.label} className="gap-1">
                <Text className="px-2 py-2 text-xs font-medium text-sidebar-foreground/70">
                  {group.label}
                </Text>
                {group.sections.map((section) => {
                  const active = pathname.startsWith(section.href)
                  return (
                    <Pressable
                      key={section.href}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      className={cn(
                        "h-9 flex-row items-center gap-2 rounded-lg px-2",
                        active && "bg-sidebar-accent"
                      )}
                      onPress={() => {
                        router.navigate(section.href)
                        onClose()
                      }}
                    >
                      <Icon
                        as={section.icon}
                        size={16}
                        className={
                          active
                            ? "text-sidebar-accent-foreground"
                            : "text-sidebar-foreground"
                        }
                      />
                      <Text
                        className={cn(
                          "flex-1 text-sm text-sidebar-foreground",
                          active && "font-medium text-sidebar-accent-foreground"
                        )}
                      >
                        {section.title}
                      </Text>
                      {!section.isAvailable && (
                        <Text className="text-xs text-sidebar-foreground">
                          Soon
                        </Text>
                      )}
                    </Pressable>
                  )
                })}
              </View>
            ))}
          </View>
          <View className="gap-1 p-2">
            {menuOpen && (
              <Pressable
                accessibilityRole="button"
                className="h-9 flex-row items-center gap-2 rounded-lg px-2 active:bg-sidebar-accent"
                onPress={() => {
                  setMenuOpen(false)
                  onClose()
                  router.replace("/")
                }}
              >
                <Icon
                  as={LogOut}
                  size={16}
                  className="text-sidebar-foreground"
                />
                <Text className="text-sm">Sign out</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: menuOpen }}
              className="flex-row items-center gap-2 rounded-lg p-2 active:bg-sidebar-accent"
              onPress={() => setMenuOpen(!menuOpen)}
            >
              <View className="size-8 items-center justify-center rounded-lg bg-sidebar-accent">
                <Text className="text-primary">D</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-foreground">
                  Demo session
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Decorative sign-in
                </Text>
              </View>
              <Icon
                as={ChevronsUpDown}
                size={16}
                className="text-sidebar-foreground"
              />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  )
}
