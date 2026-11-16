import {
  getRotationPlan,
  getRotationPlanQueryKey,
  getRotationPlanSetup,
  getRotationPlanSetupQueryKey,
} from "@cropilot/api"
import { queryOptions } from "@tanstack/react-query"
import { translate } from "@/lib/i18n"

const RUN_NOT_FOUND_STATUS = 404

/** The server no longer knows this run: it restarted, or the run is not the caller's. */
export class RunGoneError extends Error {
  constructor() {
    super("This run is gone")
    this.name = "RunGoneError"
  }
}

/**
 * Shares the generated query key, so the snapshot returned when a run starts seeds this query.
 * A 404 is an expected state: it becomes `RunGoneError`.
 */
export function rotationPlanOptions(runId: string) {
  return queryOptions({
    queryKey: getRotationPlanQueryKey({ path: { run_id: runId } }),
    queryFn: async ({ signal }) => {
      const { data, response } = await getRotationPlan({
        path: { run_id: runId },
        signal,
      })
      if (data) return data
      if (response?.status === RUN_NOT_FOUND_STATUS) throw new RunGoneError()
      throw new Error(
        translate("Could not read the planner run ({value1})", {
          value1: response?.status ?? "no response",
        })
      )
    },
  })
}

/** The `detail` of a FastAPI error body, which is a string for 404, 409 and 503. */
function errorDetail(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "detail" in error &&
    typeof error.detail === "string"
  ) {
    return error.detail
  }
  return null
}

/**
 * The endpoint reads the region from the workspace, so the id only goes into the key:
 * switching region must not reuse the old region's setup.
 */
export function rotationPlanSetupOptions(regionId: string) {
  return queryOptions({
    queryKey: [...getRotationPlanSetupQueryKey(), regionId],
    queryFn: async ({ signal }) => {
      const { data, error, response } = await getRotationPlanSetup({ signal })
      if (data) return data
      throw new Error(
        errorDetail(error) ??
          translate("Could not load the planner setup ({value1})", {
            value1: response?.status ?? "no response",
          })
      )
    },
  })
}

export function startErrorMessage(error: unknown): string {
  const detail = errorDetail(error)
  if (detail) return detail
  if (error instanceof Error) return error.message
  return "The planner could not start. Check the priorities and try again."
}
