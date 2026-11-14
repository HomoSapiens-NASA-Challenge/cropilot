import { createFileRoute } from "@tanstack/react-router"
import { PlannedTab } from "@/features/season/planned-tab"

export const Route = createFileRoute("/_authenticated/dashboard/region")({
  component: RegionPage,
})

function RegionPage() {
  return <PlannedTab path="/dashboard/region" />
}
