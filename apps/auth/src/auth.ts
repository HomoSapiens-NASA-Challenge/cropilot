import { expo } from "@better-auth/expo"
import { betterAuth } from "better-auth"
import { jwt } from "better-auth/plugins"
import { Pool } from "pg"
import { env } from "./env.ts"

/** Postgres schema owned by this service. The backend never reads it. */
export const AUTH_SCHEMA = "auth"

const MOBILE_SCHEME = "cropilot://"
// Expo Go serves the app from exp:// URLs, so they are trusted in development only.
const EXPO_GO_ORIGINS = ["exp://", "exp://**"]

export const pool = new Pool({
  connectionString: env.databaseUrl,
  options: `-c search_path=${AUTH_SCHEMA}`,
})

export const auth = betterAuth({
  baseURL: env.baseUrl,
  secret: env.secret,
  database: pool,
  socialProviders: {
    google: {
      clientId: env.googleClientId,
      clientSecret: env.googleClientSecret,
    },
  },
  trustedOrigins: env.isProduction
    ? [MOBILE_SCHEME]
    : [MOBILE_SCHEME, ...EXPO_GO_ORIGINS],
  plugins: [
    // Access tokens for the backend, which verifies them against /api/auth/jwks.
    // The payload is the contract with `app/core/auth.py`: keep both in sync.
    jwt({
      jwt: {
        definePayload: ({ user }) => ({ email: user.email, name: user.name }),
      },
    }),
    expo(),
  ],
})
