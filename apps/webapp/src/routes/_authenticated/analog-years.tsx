import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/page-header"
import { zoneCaseOptions } from "@/features/case/case-queries"
import { RegionCaseScreen } from "@/features/case/region-case-screen"
import { YearsBlock } from "@/features/case/years-block"
import { appSections } from "@/features/shell/sections"

const section = appSections.analogYears

export const Route = createFileRoute("/_authenticated/analog-years")({
  staticData: { title: section.title },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(zoneCaseOptions(context.region.id)),
  component: AnalogYearsPage,
})

function AnalogYearsPage() {
  const { region } = Route.useRouteContext()
  const { data: bundle } = useSuspenseQuery(zoneCaseOptions(region.id))

  return (
    <>
      <PageHeader title={section.title} description={section.description} />
      <RegionCaseScreen bundle={bundle} region={region}>
        {(regionCase) => <YearsBlock bundle={regionCase} />}
      </RegionCaseScreen>
    </>
  )
}
