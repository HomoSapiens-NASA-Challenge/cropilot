import { Stack } from "expo-router"
import { AccountButton } from "@/features/shell/account-button"
import { headerOptions } from "@/features/shell/header-options"

export default function OverviewLayout() {
  return (
    <Stack screenOptions={{ ...headerOptions, headerBackVisible: false }}>
      <Stack.Screen
        name="index"
        options={{ title: "Home", headerRight: () => <AccountButton /> }}
      />
    </Stack>
  )
}
