import { queryOptions } from "@tanstack/react-query"
import { authClient } from "@/lib/auth"

const SESSION_STALE_MS = 5 * 60 * 1000

/** The current session, or `null` when signed out. */
export const sessionOptions = queryOptions({
  queryKey: ["session"],
  queryFn: async () => {
    const { data, error } = await authClient.getSession()
    if (error) {
      throw new Error(error.message ?? "Could not load the session")
    }
    return data
  },
  staleTime: SESSION_STALE_MS,
})

export async function signInWithGoogle(): Promise<void> {
  const { error } = await authClient.signIn.social({
    provider: "google",
    callbackURL: "/farms",
  })
  if (error) {
    throw new Error(error.message ?? "Could not sign in")
  }
}

export async function signOut(): Promise<void> {
  await authClient.signOut()
  // A full reload drops every cached query and token of the previous user.
  window.location.assign("/")
}
