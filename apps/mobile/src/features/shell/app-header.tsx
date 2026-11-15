import { router } from "expo-router"
import { ChevronRight, PanelLeft } from "lucide-react-native"
import { useState } from "react"
import { Pressable, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Separator } from "@/components/ui/separator"
import { Text } from "@/components/ui/text"
import { AppSidebar } from "@/features/shell/app-sidebar"

type HeaderParent = { title: string; href: "/map" | "/fields" }

export function AppHeader({
  title,
  parent,
}: {
  title: string
  parent?: HeaderParent
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  return (
    <SafeAreaView edges={["top"]} className="bg-background">
      <View className="h-14 flex-row items-center gap-2 border-b border-border bg-background px-4">
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          accessibilityLabel="Open navigation"
          onPress={() => setSidebarOpen(true)}
        >
          <Icon as={PanelLeft} size={16} className="text-foreground" />
        </Button>
        <Separator orientation="vertical" className="h-4" />
        {parent && (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.canGoBack()
                  ? router.back()
                  : router.navigate(parent.href)
              }
            >
              <Text className="text-sm text-muted-foreground">
                {parent.title}
              </Text>
            </Pressable>
            <Icon
              as={ChevronRight}
              size={14}
              className="text-muted-foreground"
            />
          </>
        )}
        <Text
          numberOfLines={1}
          className="flex-1 text-sm font-medium text-foreground"
        >
          {title}
        </Text>
      </View>
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </SafeAreaView>
  )
}
