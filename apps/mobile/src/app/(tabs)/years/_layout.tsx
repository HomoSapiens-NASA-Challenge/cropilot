import { Stack } from "expo-router"
import { headerOptions } from "@/features/shell/header-options"

export default function Layout() {
  return (
    <Stack screenOptions={{ ...headerOptions, headerBackVisible: false }}>
      <Stack.Screen name="index" options={{ title: "Years" }} />
    </Stack>
  )
}
