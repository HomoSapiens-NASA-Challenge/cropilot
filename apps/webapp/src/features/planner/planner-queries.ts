import { getRotationPlan, getRotationPlanQueryKey } from "@cropilot/api"
import { queryOptions } from "@tanstack/react-query"

const RUN_NOT_FOUND_STATUS = 404

/** The server no longer knows this run: it restarted, or the run is not the caller's. */
export class RunGoneError extends Error {
  constructor() {
    super("This run is gone")
    this.name = "RunGoneError"
  }
}

/**
 * The latest snapshot of one run. It shares the generated query key, so the snapshot returned
 * when a run starts seeds this query. A 404 is an expected state, not a broken request: it
 * becomes `RunGoneError`, which the screen answers with an offer to run again.
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
        `Could not read the planner run (${response?.status ?? "no response"})`
      )
    },
  })
}

/** The `detail` of a FastAPI error body, which is a string for 409 and 503. */
export function startErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "detail" in error &&
    typeof error.detail === "string"
  ) {
    return error.detail
  }
  if (error instanceof Error) return error.message
  return "The planner could not start. Check the priorities and try again."
}
