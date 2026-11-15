import { getCaseIndexOptions, getCaseOptions } from "@cropilot/api"
import type { QueryClient } from "@tanstack/react-query"
import { router } from "expo-router"
import {
  campaignHref,
  methodHref,
  strategyHref,
  waterHref,
} from "@/features/case/routes"
import {
  caseBriefing,
  nationalBriefing,
  strategyDetails,
} from "@/features/voice/case-briefing"

// Same names and parameters as the tools in scripts/voice_agent/sync.py.
// A thrown error reaches the agent as a failed tool call, so it can say so.

type ToolParameters = Record<string, unknown>

function optionalString(parameters: ToolParameters, key: string) {
  const value = parameters[key]
  if (value === undefined || value === null || value === "") return undefined
  if (typeof value !== "string") throw new Error(`${key} must be a string`)
  return value
}

function requiredString(parameters: ToolParameters, key: string) {
  const value = optionalString(parameters, key)
  if (value === undefined) throw new Error(`${key} is required`)
  return value
}

const TAB_SCREENS = {
  overview: "/overview",
  years: "/years",
  strategies: "/strategies",
  map: "/map",
} as const

function isTabScreen(screen: string): screen is keyof typeof TAB_SCREENS {
  return Object.hasOwn(TAB_SCREENS, screen)
}

export function createClientTools(
  queryClient: QueryClient,
  currentZoneId: () => string
) {
  const zoneOf = (parameters: ToolParameters) =>
    optionalString(parameters, "zone_id") ?? currentZoneId()
  const fetchCase = (zoneId: string) =>
    queryClient.fetchQuery(getCaseOptions({ path: { zone_id: zoneId } }))

  return {
    get_national_campaign: async () =>
      JSON.stringify(
        nationalBriefing(await queryClient.fetchQuery(getCaseIndexOptions()))
      ),

    get_case_briefing: async (parameters: ToolParameters) =>
      JSON.stringify(caseBriefing(await fetchCase(zoneOf(parameters)))),

    get_strategy_details: async (parameters: ToolParameters) => {
      const strategyId = requiredString(parameters, "strategy_id")
      const details = strategyDetails(
        await fetchCase(zoneOf(parameters)),
        strategyId
      )
      if (!details) throw new Error(`No strategy ${strategyId} in this zone`)
      return JSON.stringify(details)
    },

    show_case_screen: (parameters: ToolParameters) => {
      const screen = requiredString(parameters, "screen")
      const zoneId = zoneOf(parameters)
      if (isTabScreen(screen)) {
        router.navigate(TAB_SCREENS[screen])
      } else if (screen === "strategy") {
        router.navigate(strategyHref(zoneId, requiredString(parameters, "id")))
      } else if (screen === "campaign") {
        router.navigate(campaignHref(zoneId, requiredString(parameters, "id")))
      } else if (screen === "water") {
        router.navigate(waterHref(zoneId))
      } else if (screen === "method") {
        router.navigate(methodHref(zoneId))
      } else {
        throw new Error(`Unknown screen ${screen}`)
      }
      return `Opened ${screen}`
    },
  }
}
