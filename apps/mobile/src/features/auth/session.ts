import { handleFromName } from "@cropilot/api"
import type { QueryClient } from "@tanstack/react-query"
import { clearIdentity, saveIdentity } from "@/lib/auth"

export const INVALID_NAME_MESSAGE =
  "Use at least two letters or digits so we can make a handle from it."

/** Opens the workspace of the typed name. Throws when the name has no valid handle. */
export async function signIn(name: string): Promise<void> {
  const handle = handleFromName(name)
  if (handle === null) {
    throw new Error(INVALID_NAME_MESSAGE)
  }
  await saveIdentity({ id: handle, name: name.trim() })
}

export async function signOut(queryClient: QueryClient): Promise<void> {
  await clearIdentity()
  // Drop everything cached for the previous reader.
  queryClient.clear()
}
