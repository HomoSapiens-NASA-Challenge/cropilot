import "../global.css"
import { configureApi } from "@cropilot/api"
import {
  Geist_300Light,
  Geist_400Regular,
  Geist_500Medium,
  useFonts,
} from "@expo-google-fonts/geist"
import { PortalHost } from "@rn-primitives/portal"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Stack } from "expo-router"
import { ThemeProvider } from "expo-router/react-navigation"
import { StatusBar } from "expo-status-bar"
import { headerOptions } from "@/features/shell/header-options"
import { appSections } from "@/features/shell/sections"
import { VoiceAssistant } from "@/features/voice/voice-assistant"
import { VoiceProvider } from "@/features/voice/voice-provider"
import { accessToken } from "@/lib/auth"
import { API_URL } from "@/lib/env"
import { NAV_THEME } from "@/lib/theme"

configureApi({ baseUrl: API_URL, getToken: accessToken.get })

const queryClient = new QueryClient()

// Demo build: the sign-in screen is the entry and lets anyone in, so the
// field diagnostics can be shown without the auth service or the backend.
// Light only, like the web's visual system.
export default function RootLayout() {
  // Geist, like the web. Each weight is its own font family on native, so the
  // font-light/normal/medium utilities map to these names in tailwind.config.js.
  const [fontsLoaded, fontError] = useFonts({
    Geist_300Light,
    Geist_400Regular,
    Geist_500Medium,
  })
  if (fontError) {
    throw fontError
  }
  if (!fontsLoaded) {
    return null
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={NAV_THEME}>
        <VoiceProvider>
          <StatusBar style="dark" />
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen
              name="tour"
              options={{ ...headerOptions, headerShown: true, title: "" }}
            />
            <Stack.Screen name="sign-in" options={{ headerShown: false }} />
            <Stack.Screen
              name="site/[sectionSlug]/[pageSlug]"
              options={{ ...headerOptions, headerShown: true, title: "" }}
            />
            <Stack.Screen
              name="case/[zoneId]/index"
              options={{ ...headerOptions, headerShown: true, title: "Case" }}
            />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="planner"
              options={{
                ...headerOptions,
                headerShown: true,
                title: appSections.rotationPlanner.title,
              }}
            />
            <Stack.Screen
              name="farms"
              options={{ ...headerOptions, title: "Farms" }}
            />
          </Stack>
          <VoiceAssistant />
        </VoiceProvider>
        <PortalHost />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
