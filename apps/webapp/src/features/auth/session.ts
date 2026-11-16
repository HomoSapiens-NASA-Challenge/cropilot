import { handleFromName } from "@cropilot/api"
import { type QueryClient, queryOptions } from "@tanstack/react-query"
import { redirect } from "@tanstack/react-router"

/**
 * Cropilot has no accounts. The reader types a name or handle; its handle is the user id and
 * travels as the API's bearer credential. Anyone who types the same name opens the same
 * workspace, which is the intended trade for a demo that judges open without signing up.
 */
export type Session = { user: { id: string; name: string } }

const STORAGE_KEY = "cropilot.user.v1"

function storedSession(): Session | null {
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "null"
    )
    const id = stored?.id
    const name = stored?.name
    if (typeof id !== "string" || typeof name !== "string") return null
    return handleFromName(id) === id ? { user: { id, name } } : null
  } catch {
    return null
  }
}

// Storage can be unavailable (some private modes); the session then lasts until a reload.
let current: Session | null | undefined

function currentSession(): Session | null {
  if (current === undefined) current = storedSession()
  return current
}

/** The current session, or `null` when no name was given yet. */
export const sessionOptions = queryOptions({
  queryKey: ["session"],
  queryFn: currentSession,
  staleTime: Number.POSITIVE_INFINITY,
})

/** The handle the API reads as the user, if any. */
export async function getHandle(): Promise<string | undefined> {
  return currentSession()?.user.id
}

/** The current session for a page that needs one; asks for a name otherwise. */
export async function requireSession(queryClient: QueryClient) {
  const session = await queryClient.ensureQueryData(sessionOptions)
  if (!session) {
    throw redirect({ to: "/login" })
  }
  return session
}

/** Saves the typed name. Returns `null` when it has too few letters or digits for a handle. */
export function signIn(queryClient: QueryClient, name: string): Session | null {
  const id = handleFromName(name)
  if (!id) return null
  current = { user: { id, name: name.trim() } }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current.user))
  } catch {
    // Kept in memory only.
  }
  queryClient.setQueryData(sessionOptions.queryKey, current)
  return current
}

export function signOut(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing stored.
  }
  // A full reload drops every cached query of the previous user.
  window.location.assign("/")
}
