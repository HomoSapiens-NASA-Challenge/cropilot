import { configureApi } from "@cropilot/api"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Stack } from "expo-router"
import { accessToken, authClient } from "@/lib/auth"
import { API_URL } from "@/lib/env"

configureApi({ baseUrl: API_URL, getToken: accessToken.get })

const queryClient = new QueryClient()

export default function RootLayout() {
  const session = authClient.useSession()

  if (session.isPending) {
    return null
  }
  const isSignedIn = session.data !== null

  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Protected guard={isSignedIn}>
          <Stack.Screen name="index" options={{ title: "Farms" }} />
        </Stack.Protected>
        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </QueryClientProvider>
  )
}
