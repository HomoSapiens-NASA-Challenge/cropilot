import { Stack } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { UserMenu } from "@/features/auth/user-menu"
import { FarmList } from "@/features/farms/farm-list"
import { authClient } from "@/lib/auth"

export default function FarmsScreen() {
  const session = authClient.useSession()
  // Stack.Protected only renders this screen with a session.
  const userName = session.data?.user.name

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      className="flex-1 bg-background"
    >
      <Stack.Screen
        options={{
          headerRight: () =>
            userName === undefined ? null : <UserMenu name={userName} />,
        }}
      />
      <FarmList />
    </SafeAreaView>
  )
}
