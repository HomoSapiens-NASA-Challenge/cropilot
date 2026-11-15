import { getCase, getCaseIndexOptions } from "@cropilot/api"
import { queryOptions } from "@tanstack/react-query"

/** The national view of the 2026/27 campaign. */
export const caseIndexOptions = getCaseIndexOptions()

const NO_CASE_STATUS = 404

/**
 * The bundle of one zone, or `null` when the zone has no case yet (a 404 from the API).
 * Any other failure is an error: a missing case is an expected state, a broken one is not.
 */
export function zoneCaseOptions(zoneId: string) {
  return queryOptions({
    queryKey: ["case", zoneId],
    queryFn: async ({ signal }) => {
      const { data, response } = await getCase({
        path: { zone_id: zoneId },
        signal,
      })
      if (data) return data
      if (response?.status === NO_CASE_STATUS) return null
      throw new Error(
        `Could not load the case of ${zoneId} (${response?.status ?? "no response"})`
      )
    },
  })
}
