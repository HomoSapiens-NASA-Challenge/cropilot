import { getCase, getCaseIndexOptions } from "@cropilot/api"
import { queryOptions } from "@tanstack/react-query"

export const caseIndexOptions = getCaseIndexOptions()

const NO_CASE_STATUS = 404

/** `null` when the zone has no case yet (a 404): an expected state. Any other failure is an error. */
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
