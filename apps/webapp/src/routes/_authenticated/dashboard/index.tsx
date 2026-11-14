import { getSeasonDashboardOptions } from "@cropilot/api"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { SeasonView } from "@/features/season/season-view"

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: ThisSeasonPage,
})

function ThisSeasonPage() {
  const { data } = useSuspenseQuery(getSeasonDashboardOptions())
  return <SeasonView data={data} />
}
