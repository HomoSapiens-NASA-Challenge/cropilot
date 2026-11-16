import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/page-header"
import { zoneCaseOptions } from "@/features/case/case-queries"
import { CompareBlock } from "@/features/case/compare-block"
import { RegionCaseScreen } from "@/features/case/region-case-screen"
import { appSections } from "@/features/shell/sections"
import { useI18n } from "@/lib/i18n"

const section = appSections.strategies

export const Route = createFileRoute("/_authenticated/strategies")({
  staticData: { title: section.title },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(zoneCaseOptions(context.region.id)),
  component: StrategiesPage,
})

function StrategiesPage() {
  const { t } = useI18n("app")

  const { region } = Route.useRouteContext()
  const { data: bundle } = useSuspenseQuery(zoneCaseOptions(region.id))

  return (
    <>
      <PageHeader
        title={t(section.title)}
        description={t(section.description)}
      />
      <RegionCaseScreen bundle={bundle} region={region}>
        {(regionCase) => <CompareBlock bundle={regionCase} />}
      </RegionCaseScreen>
    </>
  )
}
