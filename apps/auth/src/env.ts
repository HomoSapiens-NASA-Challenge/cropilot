function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  // Public origin of the app. Issuer and audience of the access tokens.
  baseUrl: required("BETTER_AUTH_URL"),
  secret: required("BETTER_AUTH_SECRET"),
  googleClientId: required("GOOGLE_CLIENT_ID"),
  googleClientSecret: required("GOOGLE_CLIENT_SECRET"),
  port: Number(process.env.AUTH_PORT ?? 3000),
  isProduction: process.env.NODE_ENV === "production",
}
