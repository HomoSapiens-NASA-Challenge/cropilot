import { Stack } from "expo-router"
import { headerOptions } from "@/features/shell/header-options"

export default function FieldsLayout() {
  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ title: "Fields" }} />
      <Stack.Screen name="[fieldId]" options={{ title: "Field" }} />
    </Stack>
  )
}
