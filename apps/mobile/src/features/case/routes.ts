import type { WaterSettings } from "@cropilot/api"

/** Converts a campaign label to a URL-safe segment. */
export function campaignSlug(campaign: string) {
  return campaign.replaceAll("/", "-")
}
/** Restores the campaign label from its URL segment. */
export function campaignFromSlug(slug: string) {
  return slug.replaceAll("-", "/")
}
/** Builds the case overview route. */
export function caseHref(zoneId: string) {
  return { pathname: "/case/[zoneId]", params: { zoneId } } as const
}
/** Builds the public case assistant route. */
export function askHref(zoneId: string) {
  return { pathname: "/case/[zoneId]/ask", params: { zoneId } } as const
}
/** Builds a campaign detail route. */
export function campaignHref(zoneId: string, campaign: string) {
  return {
    pathname: "/case/[zoneId]/campaign/[campaign]",
    params: { zoneId, campaign: campaignSlug(campaign) },
  } as const
}
/** Builds a strategy detail route. */
export function strategyHref(zoneId: string, strategyId: string) {
  return {
    pathname: "/case/[zoneId]/strategy/[strategyId]",
    params: { zoneId, strategyId },
  } as const
}
/** Builds the campaign leaders route. */
export function leadersHref(zoneId: string) {
  return { pathname: "/case/[zoneId]/leaders", params: { zoneId } } as const
}
/** Builds the water detail route. */
export function waterHref(zoneId: string) {
  return { pathname: "/case/[zoneId]/water", params: { zoneId } } as const
}
/** Builds one rotation's water route, for the chosen campaign and settings. */
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
/** Builds a lot detail route. */
export function lotHref(zoneId: string, lotId: string) {
  return {
    pathname: "/case/[zoneId]/lot/[lotId]",
    params: { zoneId, lotId },
  } as const
}
/** Builds the field footprint route. */
export function footprintHref(zoneId: string) {
  return { pathname: "/case/[zoneId]/footprint", params: { zoneId } } as const
}
/** Builds the zones route. */
export function zonesHref(zoneId: string) {
  return { pathname: "/case/[zoneId]/zones", params: { zoneId } } as const
}
/** Builds the method and limits route. */
export function methodHref(zoneId: string) {
  return { pathname: "/case/[zoneId]/method", params: { zoneId } } as const
}
