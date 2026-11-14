/** Refresh this long before the token expires, so a request never carries a stale one. */
const EXPIRY_MARGIN_MS = 30_000

type TokenFetcher = () => Promise<string | undefined>

/**
 * Wraps the call that asks the auth service for an access token, so the token
 * is reused until it is about to expire and concurrent callers share one request.
 */
export function createTokenCache(fetchToken: TokenFetcher) {
  let pending: Promise<string | undefined> | undefined
  let expiresAt = 0

  return {
    get(): Promise<string | undefined> {
      if (!pending || Date.now() >= expiresAt) {
        // Hold the in-flight request until it settles.
        expiresAt = Number.POSITIVE_INFINITY
        pending = fetchToken().then(
          (token) => {
            expiresAt = token ? expiryOf(token) - EXPIRY_MARGIN_MS : 0
            return token
          },
          (error: unknown) => {
            expiresAt = 0
            throw error
          }
        )
      }
      return pending
    },
    /** Call on sign-out. */
    clear(): void {
      pending = undefined
      expiresAt = 0
    },
  }
}

/** Expiry of a JWT in epoch milliseconds, read from its `exp` claim. */
function expiryOf(token: string): number {
  const payload = token.split(".")[1] ?? ""
  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
  const { exp } = JSON.parse(atob(base64)) as { exp: number }
  return exp * 1000
}
