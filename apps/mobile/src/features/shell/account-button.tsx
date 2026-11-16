import { useQueryClient } from "@tanstack/react-query"
import { router } from "expo-router"
import { UserRound } from "lucide-react-native"
import { useState } from "react"
import { Pressable, View } from "react-native"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Sheet } from "@/components/ui/sheet"
import { Text } from "@/components/ui/text"
import { signOut } from "@/features/auth/session"
import { useIdentity } from "@/lib/auth"

export function AccountButton() {
  const [open, setOpen] = useState(false)
  const identity = useIdentity()
  const queryClient = useQueryClient()

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
        {identity ? (
          <View className="gap-6">
            <View className="gap-1">
              <Text className="font-medium">{identity.name}</Text>
              <Text className="text-sm text-muted-foreground">
                @{identity.id}
              </Text>
            </View>
            <View className="gap-2">
              <Button
                onPress={() => {
                  setOpen(false)
                  router.push("/farms")
                }}
              >
                <Text>Your farms</Text>
              </Button>
              <Button
                variant="outline"
                onPress={() => {
                  setOpen(false)
                  void signOut(queryClient).then(() => {
                    if (router.canDismiss()) router.dismissAll()
                    router.replace("/")
                  })
                }}
              >
                <Text>Sign out</Text>
              </Button>
            </View>
          </View>
        ) : (
          <View className="gap-6">
            <View className="gap-1">
              <Text className="font-medium">Not signed in</Text>
              <Text className="text-sm text-muted-foreground">
                Type your name to keep your own farms.
              </Text>
            </View>
            <Button
              onPress={() => {
                setOpen(false)
                router.push("/sign-in")
              }}
            >
              <Text>Sign in</Text>
            </Button>
          </View>
        )}
      </Sheet>
    </>
  )
}
