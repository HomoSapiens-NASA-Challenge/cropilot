import type { WaterSettings } from "@cropilot/api"

export function campaignSlug(campaign: string) {
  return campaign.replaceAll("/", "-")
}
export function campaignFromSlug(slug: string) {
  return slug.replaceAll("-", "/")
}
export function caseHref(zoneId: string) {
  return { pathname: "/case/[zoneId]", params: { zoneId } } as const
}
export function askHref(zoneId: string) {
  return { pathname: "/case/[zoneId]/ask", params: { zoneId } } as const
}
export function campaignHref(zoneId: string, campaign: string) {
  return {
    pathname: "/case/[zoneId]/campaign/[campaign]",
    params: { zoneId, campaign: campaignSlug(campaign) },
  } as const
}
export function strategyHref(zoneId: string, strategyId: string) {
  return {
    pathname: "/case/[zoneId]/strategy/[strategyId]",
    params: { zoneId, strategyId },
  } as const
}
export function leadersHref(zoneId: string) {
  return { pathname: "/case/[zoneId]/leaders", params: { zoneId } } as const
}
export function waterHref(zoneId: string) {
  return { pathname: "/case/[zoneId]/water", params: { zoneId } } as const
}
export function waterStrategyHref(
  zoneId: string,
  strategyId: string,
  settings: WaterSettings,
  scenarioId: string | null
) {
  return {
    pathname: "/case/[zoneId]/water/[strategyId]",
    params: {
      zoneId,
      strategyId,
      depth: String(settings.depth_m),
      fraction: String(settings.initial_water_fraction),
      shift: String(settings.summer_shift_days),
      ...(scenarioId === null ? {} : { scenario: scenarioId }),
    },
  } as const
}
export function lotHref(zoneId: string, lotId: string) {
  return {
    pathname: "/case/[zoneId]/lot/[lotId]",
    params: { zoneId, lotId },
  } as const
}
export function footprintHref(zoneId: string) {
  return { pathname: "/case/[zoneId]/footprint", params: { zoneId } } as const
}
export function zonesHref(zoneId: string) {
  return { pathname: "/case/[zoneId]/zones", params: { zoneId } } as const
}
export function methodHref(zoneId: string) {
  return { pathname: "/case/[zoneId]/method", params: { zoneId } } as const
}
