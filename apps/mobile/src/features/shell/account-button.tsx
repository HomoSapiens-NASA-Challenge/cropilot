import { router } from "expo-router"
import { UserRound } from "lucide-react-native"
import { useState } from "react"
import { Pressable, View } from "react-native"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Sheet } from "@/components/ui/sheet"
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
      <Sheet open={open} onClose={() => setOpen(false)}>
        <View className="gap-6">
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
      </Sheet>
    </>
  )
}
