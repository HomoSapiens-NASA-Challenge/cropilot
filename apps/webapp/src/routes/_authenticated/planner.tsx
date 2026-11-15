import { useSuspenseQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  type ErrorComponentProps,
  useRouter,
} from "@tanstack/react-router"
import { RotateCcw } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Notice } from "@/features/planner/planner-notice"
import { rotationPlanSetupOptions } from "@/features/planner/planner-queries"
import { PlannerScreen } from "@/features/planner/planner-screen"
import { appSections } from "@/features/shell/sections"

const section = appSections.rotationPlanner

export const Route = createFileRoute("/_authenticated/planner")({
  staticData: { title: section.title },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(
      rotationPlanSetupOptions(context.region.id)
    ),
  component: PlannerPage,
  errorComponent: PlannerError,
})

function PlannerPage() {
  const { region } = Route.useRouteContext()
  const { data: setup } = useSuspenseQuery(rotationPlanSetupOptions(region.id))

  return (
    <>
      <PageHeader title={section.title} description={section.description} />
      {/* A new region starts a new wizard: nothing of the old one carries over. */}
      <PlannerScreen key={region.id} region={region} setup={setup} />
    </>
  )
}

/** The planner could not load its setup, for instance a region the simulator has no field for. */
function PlannerError({ error }: ErrorComponentProps) {
  const router = useRouter()
  const message =
    error instanceof Error ? error.message : "The planner could not load"

  return (
    <>
      <PageHeader title={section.title} description={section.description} />
      <Notice
        action={
          <Button variant="outline" onClick={() => router.invalidate()}>
            <RotateCcw aria-hidden data-icon="inline-start" />
            Try again
          </Button>
        }
      >
        {message.replace(/\.$/, "")}. You can also switch region from the
        sidebar.
      </Notice>
    </>
  )
}
