import { router } from "expo-router"
import { UserRound } from "lucide-react-native"
import { useState } from "react"
import { Modal, Pressable, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"

export function AccountButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Account"
        className="size-11 items-center justify-center"
        onPress={() => setOpen(true)}
      >
        <Icon as={UserRound} size={22} className="text-primary" />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View className="flex-1 justify-end">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close account"
            className="absolute inset-0 bg-foreground/20"
            onPress={() => setOpen(false)}
          />
          {/* SafeAreaView overrides padding with the insets: style a View. */}
          <View className="rounded-t-2xl bg-background">
            <SafeAreaView edges={["bottom"]}>
              <View className="gap-6 px-6 pt-3 pb-6">
                <View
                  aria-hidden
                  className="h-1 w-10 self-center rounded-full bg-border"
                />
                <View className="gap-1">
                  <Text className="font-medium">Demo session</Text>
                  <Text className="text-sm text-muted-foreground">
                    Decorative sign-in
                  </Text>
                </View>
                <Button
                  onPress={() => {
                    setOpen(false)
                    if (router.canDismiss()) router.dismissAll()
                    router.replace("/")
                  }}
                >
                  <Text>Sign out</Text>
                </Button>
              </View>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    </>
  )
}
