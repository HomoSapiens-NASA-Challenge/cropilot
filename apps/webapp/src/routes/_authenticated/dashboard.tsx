import { getSeasonDashboardOptions } from "@cropilot/api"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Outlet } from "@tanstack/react-router"
import { DashboardShell } from "@/features/season/dashboard-shell"

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(getSeasonDashboardOptions()),
  component: DashboardLayout,
})

function DashboardLayout() {
  const { data } = useSuspenseQuery(getSeasonDashboardOptions())
  return (
    <DashboardShell data={data}>
      <Outlet />
    </DashboardShell>
  )
}
