import { getCaseIndexOptions, getCaseOptions } from "@cropilot/api"
import { useQuery } from "@tanstack/react-query"

class CaseHttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`)
  }
}

const caseFetch: typeof fetch = async (request, init) => {
  const response = await fetch(request, init)
  if (!response.ok) throw new CaseHttpError(response.status)
  return response
}

type CaseState<T> =
  | { status: "loading" }
  | { status: "notFound" }
  | { status: "unavailable" }
  | { status: "ready"; data: T }

function caseState<T>(query: {
  data: T | undefined
  error: unknown
  isPending: boolean
  isError: boolean
}): CaseState<T> {
  if (query.isError)
    return {
      status:
        query.error instanceof CaseHttpError && query.error.status === 404
          ? "notFound"
          : "unavailable",
    }
  if (query.isPending || query.data === undefined) return { status: "loading" }
  return { status: "ready", data: query.data }
}

export function useCaseBundle(zoneId: string) {
  return caseState(
    useQuery({
      ...getCaseOptions({ path: { zone_id: zoneId }, fetch: caseFetch }),
      retry: false,
    })
  )
}

export function useCaseIndex() {
  return caseState(
    useQuery({ ...getCaseIndexOptions({ fetch: caseFetch }), retry: false })
  )
}
