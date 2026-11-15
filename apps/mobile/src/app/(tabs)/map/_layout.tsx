import { Stack } from "expo-router"
import { headerOptions } from "@/features/shell/header-options"

export default function MapLayout() {
  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ title: "Map" }} />
      <Stack.Screen name="[farmId]" options={{ title: "Farm" }} />
    </Stack>
  )
}
