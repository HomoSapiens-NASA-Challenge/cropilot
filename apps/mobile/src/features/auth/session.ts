import type { QueryClient } from "@tanstack/react-query"
import { accessToken, authClient } from "@/lib/auth"

/** Opens the browser for Google. The session updates when the app is reopened by the deep link. */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await authClient.signIn.social({
    provider: "google",
    callbackURL: "/",
  })
  if (error) {
    throw new Error(error.message ?? "Could not sign in")
  }
}

export async function signOut(queryClient: QueryClient): Promise<void> {
  await authClient.signOut()
  // Drop everything cached for the previous user.
  accessToken.clear()
  queryClient.clear()
}
