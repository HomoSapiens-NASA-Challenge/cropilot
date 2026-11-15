import { Tabs } from "expo-router/tabs"
import {
  CalendarSearch,
  LayoutDashboard,
  Map as MapIcon,
  Satellite,
} from "lucide-react-native"
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
            <LayoutDashboard color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color }) => <MapIcon color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="fields"
        options={{
          title: "Fields",
          tabBarIcon: ({ color }) => <Satellite color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="analysis"
        options={{
          title: "Analysis",
          tabBarIcon: ({ color }) => <CalendarSearch color={color} size={22} />,
        }}
      />
    </Tabs>
  )
}
