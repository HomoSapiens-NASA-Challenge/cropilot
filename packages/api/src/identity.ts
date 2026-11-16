/**
 * Cropilot has no accounts: the reader types a name or handle, and its handle is the user id.
 * The handle travels as the bearer credential. It is not a secret: anyone who types the same
 * name opens the same workspace, which is the intended trade for a demo with no sign-in.
 */

/** Same rule as the backend: 2 to 40 lowercase letters, digits and inner hyphens. */
const HANDLE_PATTERN = /^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$/

/** The handle of a typed name, or `null` when it has too few letters or digits. */
export function handleFromName(name: string): string | null {
  const handle = name
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "")
  return HANDLE_PATTERN.test(handle) ? handle : null
}
