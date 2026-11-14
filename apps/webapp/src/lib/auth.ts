import { createTokenCache } from "@cropilot/api"
import { jwtClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

/** Talks to the auth service on the same origin, under `/api/auth`. */
export const authClient = createAuthClient({ plugins: [jwtClient()] })

/** Access token the backend accepts, reused until it is about to expire. */
export const accessToken = createTokenCache(async () => {
  const { data } = await authClient.token()
  return data?.token
})
