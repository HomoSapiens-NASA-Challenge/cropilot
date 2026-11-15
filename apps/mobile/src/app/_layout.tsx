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
import { AppHeader } from "@/features/shell/app-header"
import { appSections } from "@/features/shell/sections"
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
        <StatusBar style="dark" />
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen
            name="site/[sectionSlug]/[pageSlug]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="overview"
            options={{
              title: appSections.overview.title,
              header: ({ options }) => (
                <AppHeader
                  title={options.title ?? appSections.overview.title}
                />
              ),
            }}
          />
          <Stack.Screen
            name="map/index"
            options={{
              title: appSections.farmMap.title,
              header: ({ options }) => (
                <AppHeader title={options.title ?? appSections.farmMap.title} />
              ),
            }}
          />
          <Stack.Screen
            name="map/[farmId]"
            options={{
              title: "Farm",
              header: ({ options }) => (
                <AppHeader
                  title={options.title ?? "Farm"}
                  parent={{
                    title: appSections.farmMap.title,
                    href: appSections.farmMap.href,
                  }}
                />
              ),
            }}
          />
          <Stack.Screen
            name="fields/index"
            options={{
              title: appSections.fieldFootprints.title,
              header: ({ options }) => (
                <AppHeader
                  title={options.title ?? appSections.fieldFootprints.title}
                />
              ),
            }}
          />
          <Stack.Screen
            name="fields/[fieldId]"
            options={{
              title: "Field",
              header: ({ options }) => (
                <AppHeader
                  title={options.title ?? "Field"}
                  parent={{
                    title: appSections.fieldFootprints.title,
                    href: appSections.fieldFootprints.href,
                  }}
                />
              ),
            }}
          />
          <Stack.Screen
            name="analog-years"
            options={{
              title: appSections.analogYears.title,
              header: ({ options }) => (
                <AppHeader
                  title={options.title ?? appSections.analogYears.title}
                />
              ),
            }}
          />
          <Stack.Screen
            name="strategies"
            options={{
              title: appSections.strategies.title,
              header: ({ options }) => (
                <AppHeader
                  title={options.title ?? appSections.strategies.title}
                />
              ),
            }}
          />
          <Stack.Screen
            name="assistant"
            options={{
              title: appSections.assistant.title,
              header: ({ options }) => (
                <AppHeader
                  title={options.title ?? appSections.assistant.title}
                />
              ),
            }}
          />
          <Stack.Screen
            name="farms"
            options={{
              title: "Farms",
              header: ({ options }) => (
                <AppHeader title={options.title ?? "Farms"} />
              ),
            }}
          />
        </Stack>
        <PortalHost />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
