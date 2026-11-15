import { Stack } from "expo-router"
import { headerOptions } from "@/features/shell/header-options"
import { appSections } from "@/features/shell/sections"

export default function AnalysisLayout() {
  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ title: "Analysis" }} />
      <Stack.Screen
        name="analog-years"
        options={{ title: appSections.analogYears.title }}
      />
      <Stack.Screen
        name="strategies"
        options={{ title: appSections.strategies.title }}
      />
      <Stack.Screen
        name="assistant"
        options={{ title: appSections.assistant.title }}
      />
    </Stack>
  )
}
