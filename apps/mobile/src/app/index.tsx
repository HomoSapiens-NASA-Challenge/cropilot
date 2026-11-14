import { Stack } from "expo-router"
import { SignOutButton } from "@/features/auth/sign-out-button"
import { FarmList } from "@/features/farms/farm-list"

export default function FarmsScreen() {
  return (
    <>
      <Stack.Screen options={{ headerRight: () => <SignOutButton /> }} />
      <FarmList />
    </>
  )
}
