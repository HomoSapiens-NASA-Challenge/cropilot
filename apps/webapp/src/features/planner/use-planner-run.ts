import {
  getRotationPlanQueryKey,
  type RotationPlanRequest,
  startRotationPlanMutation,
} from "@cropilot/api"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import {
  RunGoneError,
  rotationPlanOptions,
  startErrorMessage,
} from "@/features/planner/planner-queries"

const POLL_INTERVAL_MS = 250
const MAX_READ_RETRIES = 3

/** Keeps the last finished run so its results stay on screen while the next one computes. */
export function usePlannerRun() {
  const queryClient = useQueryClient()
  const [runId, setRunId] = useState<string | null>(null)
  const [previousRunId, setPreviousRunId] = useState<string | null>(null)

  const start = useMutation({
    ...startRotationPlanMutation(),
    onSuccess: (run) => {
      queryClient.setQueryData(
        getRotationPlanQueryKey({ path: { run_id: run.run_id } }),
        run
      )
      setRunId(run.run_id)
    },
  })

  const current = useQuery({
    ...rotationPlanOptions(runId ?? ""),
    enabled: runId !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === "queued" || status === "running"
        ? POLL_INTERVAL_MS
        : false
    },
    retry: (failureCount, error) =>
      !(error instanceof RunGoneError) && failureCount < MAX_READ_RETRIES,
  })

  // Never fetches: it only reads the snapshot of the last finished run from the cache.
  const previous = useQuery({
    ...rotationPlanOptions(previousRunId ?? ""),
    enabled: false,
  })

  const run = current.data
  const lastFinishedRunId = run?.result ? runId : previousRunId

  return {
    run,
    previousRun: previous.data,
    isGone: current.error instanceof RunGoneError,
    readError:
      current.error && !(current.error instanceof RunGoneError)
        ? current.error.message
        : null,
    isStarting: start.isPending,
    startError: start.error ? startErrorMessage(start.error) : null,
    startRun: (request: RotationPlanRequest) => {
      setPreviousRunId(lastFinishedRunId)
      start.mutate({ body: request })
    },
  }
}
