import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/page-header"
import { PlannerScreen } from "@/features/planner/planner-screen"
import { appSections } from "@/features/shell/sections"

const section = appSections.rotationPlanner

export const Route = createFileRoute("/_authenticated/planner")({
  staticData: { title: section.title },
  component: PlannerPage,
})

function PlannerPage() {
  const { region } = Route.useRouteContext()

  return (
    <>
      <PageHeader title={section.title} description={section.description} />
      <PlannerScreen region={region} />
    </>
  )
}
