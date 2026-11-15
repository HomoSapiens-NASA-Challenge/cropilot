import { listFarmsOptions } from "@cropilot/api"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/page-header"
import { SectionCard } from "@/features/shell/section-card"
import { appSections } from "@/features/shell/sections"

export const Route = createFileRoute("/_authenticated/overview")({
  staticData: { title: appSections.overview.title },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(listFarmsOptions()),
  component: OverviewPage,
})

function OverviewPage() {
  const { user } = Route.useRouteContext()
  const { data: farms } = useSuspenseQuery(listFarmsOptions())
  const firstName = user.name.split(" ")[0]

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Start from a farm, find the years that started like this one and compare rotations."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <SectionCard section={appSections.farms}>
          <p className="text-4xl font-light tracking-tighter">
            {farms.length}
            <span className="ml-2 text-sm font-normal tracking-normal text-muted-foreground">
              {farms.length === 1 ? "farm" : "farms"}
            </span>
          </p>
        </SectionCard>
        <SectionCard section={appSections.farmMap} />
        <SectionCard section={appSections.analogYears} />
        <SectionCard section={appSections.strategies} />
        <SectionCard section={appSections.assistant} />
      </div>
    </>
  )
}
