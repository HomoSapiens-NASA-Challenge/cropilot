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
import { getHandle, useIdentity } from "@/lib/auth"
import { API_URL } from "@/lib/env"
import { NAV_THEME } from "@/lib/theme"

configureApi({ baseUrl: API_URL, getToken: getHandle })

const queryClient = new QueryClient()

export default function RootLayout() {
  // `undefined` while the stored identity loads: the guard below must not
  // decide yet, or a signed-in reader would flash the signed-out stack.
  const identity = useIdentity()
  // Each weight is its own font family on native; tailwind.config.js maps the
  // font-light/normal/medium utilities to these names.
  const [fontsLoaded, fontError] = useFonts({
    Geist_300Light,
    Geist_400Regular,
    Geist_500Medium,
  })
  if (fontError) {
    throw fontError
  }
  if (!fontsLoaded || identity === undefined) {
    return null
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={NAV_THEME}>
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
          <Stack.Protected guard={identity !== null}>
            <Stack.Screen
              name="farms"
              options={{ ...headerOptions, title: "Farms" }}
            />
          </Stack.Protected>
        </Stack>
        <PortalHost />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
