import { Tabs } from "expo-router/tabs"
import { appSections } from "@/features/shell/sections"
import { NAV_THEME, SVG_COLORS } from "@/lib/theme"

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: NAV_THEME.colors.primary,
        tabBarInactiveTintColor: SVG_COLORS.mutedForeground,
        tabBarStyle: {
          backgroundColor: NAV_THEME.colors.background,
          borderTopColor: NAV_THEME.colors.border,
        },
        tabBarLabelStyle: { fontFamily: "Geist_500Medium", fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="overview"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <appSections.overview.icon color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="years"
        options={{
          title: "Years",
          tabBarIcon: ({ color }) => (
            <appSections.analogYears.icon color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="strategies"
        options={{
          title: "Strategies",
          tabBarIcon: ({ color }) => (
            <appSections.strategies.icon color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color }) => (
            <appSections.farmMap.icon color={color} size={22} />
          ),
        }}
      />
    </Tabs>
  )
}
