import { type QueryClient, queryOptions } from "@tanstack/react-query"
import { redirect } from "@tanstack/react-router"
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

/**
 * The session as the public pages see it. A failed lookup (the auth service is down)
 * reads as signed out, so the landing and the case never depend on authentication.
 */
export const publicSessionOptions = queryOptions({
  queryKey: ["session", "public"],
  queryFn: async () => {
    try {
      const { data, error } = await authClient.getSession()
      return error ? null : data
    } catch {
      return null
    }
  },
  staleTime: SESSION_STALE_MS,
})

/** The current session for a page that needs one; sends the reader to log in otherwise. */
export async function requireSession(queryClient: QueryClient) {
  const session = await queryClient.ensureQueryData(sessionOptions)
  if (!session) {
    throw redirect({ to: "/login" })
  }
  return session
}

export async function signInWithGoogle(): Promise<void> {
  const { error } = await authClient.signIn.social({
    provider: "google",
    callbackURL: "/overview",
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
