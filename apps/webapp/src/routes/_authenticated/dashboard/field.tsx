import { createFileRoute } from "@tanstack/react-router"
import { PlannedTab } from "@/features/season/planned-tab"

export const Route = createFileRoute("/_authenticated/dashboard/field")({
  component: FieldPage,
})

function FieldPage() {
  return <PlannedTab path="/dashboard/field" />
}
