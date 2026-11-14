import { useQueryClient } from "@tanstack/react-query"
import { Button } from "react-native"
import { signOut } from "@/features/auth/session"

export function SignOutButton() {
  const queryClient = useQueryClient()

  return <Button title="Sign out" onPress={() => signOut(queryClient)} />
}
