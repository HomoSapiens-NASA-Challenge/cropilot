import { Stack } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { UserMenu } from "@/features/auth/user-menu"
import { FarmList } from "@/features/farms/farm-list"
import { useIdentity } from "@/lib/auth"

export default function FarmsScreen() {
  // Stack.Protected only renders this screen with an identity.
  const identity = useIdentity()

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      className="flex-1 bg-background"
    >
      <Stack.Screen
        options={{
          headerRight: () =>
            identity ? <UserMenu identity={identity} /> : null,
        }}
      />
      <FarmList />
    </SafeAreaView>
  )
}
