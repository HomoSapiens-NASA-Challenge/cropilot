import { getSeasonDashboardOptions } from "@cropilot/api"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Evidence } from "@/features/season/evidence"

export const Route = createFileRoute("/_authenticated/dashboard/evidence")({
  component: EvidencePage,
})

function EvidencePage() {
  const { data } = useSuspenseQuery(getSeasonDashboardOptions())
  return <Evidence data={data} />
}
