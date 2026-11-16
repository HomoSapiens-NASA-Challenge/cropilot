import * as SecureStore from "expo-secure-store"
import { useSyncExternalStore } from "react"

/** Who the reader is: `id` is the handle the backend takes as the bearer credential. */
export type Identity = { id: string; name: string }

const STORAGE_KEY = "cropilot.identity"

/** `undefined` until the stored identity has been read, then the identity or `null`. */
let current: Identity | null | undefined
const listeners = new Set<() => void>()

function publish(next: Identity | null) {
  current = next
  for (const listener of listeners) listener()
}

function parseIdentity(raw: string | null): Identity | null {
  if (raw === null) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (
      typeof value === "object" &&
      value !== null &&
      "id" in value &&
      "name" in value &&
      typeof value.id === "string" &&
      typeof value.name === "string"
    ) {
      return { id: value.id, name: value.name }
    }
  } catch {
    // A corrupted entry counts as signed out.
  }
  return null
}

const hydrated = SecureStore.getItemAsync(STORAGE_KEY)
  .then(parseIdentity, () => null)
  .then((identity) => {
    // A sign-in that finished before the read returned wins over the stored value.
    if (current === undefined) publish(identity)
  })

/** The stored identity, once it has loaded. */
export async function getIdentity(): Promise<Identity | null> {
  await hydrated
  return current ?? null
}

/** The handle for `configureApi({ getToken })`, or `undefined` when signed out. */
export async function getHandle(): Promise<string | undefined> {
  return (await getIdentity())?.id
}

export async function saveIdentity(identity: Identity): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(identity))
  publish(identity)
}

export async function clearIdentity(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY)
  publish(null)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The signed-in identity, `null` when signed out, `undefined` while it loads. */
export function useIdentity(): Identity | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => undefined
  )
}
