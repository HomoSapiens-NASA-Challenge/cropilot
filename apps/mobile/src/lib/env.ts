const apiUrl = process.env.EXPO_PUBLIC_API_URL
if (!apiUrl) {
  throw new Error("Missing environment variable: EXPO_PUBLIC_API_URL")
}

/** Origin that serves the API. */
export const API_URL = apiUrl
