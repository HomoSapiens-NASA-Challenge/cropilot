import { expoClient } from "@better-auth/expo/client"
import { createTokenCache } from "@cropilot/api"
import { jwtClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"
import * as SecureStore from "expo-secure-store"
import { API_URL } from "@/lib/env"

// Must match `scheme` in app.json and the trusted origin in the auth service.
const APP_SCHEME = "cropilot"

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: APP_SCHEME,
      storagePrefix: APP_SCHEME,
      storage: SecureStore,
    }),
    jwtClient(),
  ],
})

/** Access token the backend accepts, reused until it is about to expire. */
export const accessToken = createTokenCache(async () => {
  const { data } = await authClient.token()
  return data?.token
})
