import { createFileRoute } from "@tanstack/react-router"
import { PlannedTab } from "@/features/season/planned-tab"

export const Route = createFileRoute("/_authenticated/dashboard/strategies")({
  component: StrategiesPage,
})

function StrategiesPage() {
  return <PlannedTab path="/dashboard/strategies" />
}
