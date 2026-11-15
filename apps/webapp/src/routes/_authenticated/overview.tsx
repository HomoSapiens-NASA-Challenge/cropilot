import { listFarmsOptions } from "@cropilot/api"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/page-header"
import { caseIndexOptions, zoneCaseOptions } from "@/features/case/case-queries"
import { NationalBlock } from "@/features/case/national-block"
import { RegionWithoutCase } from "@/features/case/region-case-screen"
import { StartBlock } from "@/features/case/start-block"
import { SectionCard } from "@/features/shell/section-card"
import { appSections } from "@/features/shell/sections"

export const Route = createFileRoute("/_authenticated/overview")({
  staticData: { title: appSections.overview.title },
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(listFarmsOptions()),
      context.queryClient.ensureQueryData(caseIndexOptions),
      context.queryClient.ensureQueryData(zoneCaseOptions(context.region.id)),
    ])
  },
  component: OverviewPage,
})

function OverviewPage() {
  const { user, region } = Route.useRouteContext()
  const { data: farms } = useSuspenseQuery(listFarmsOptions())
  const { data: index } = useSuspenseQuery(caseIndexOptions)
  const { data: bundle } = useSuspenseQuery(zoneCaseOptions(region.id))
  const firstName = user.name.split(" ")[0]
  const years = bundle?.years_like_this.campaigns.map(
    (campaign) => campaign.start_year
  )

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={`Scoped to ${region.name}, ${region.province}. How the ${index.campaign} campaign starts here and across Argentina, then the years like this one and the rotations compared.`}
      />
      {bundle ? (
        <StartBlock bundle={bundle} />
      ) : (
        <RegionWithoutCase region={region} />
      )}
      <NationalBlock
        index={index}
        glossary={bundle?.glossary}
        sinceYear={years && years.length > 0 ? Math.min(...years) : undefined}
        selectedZoneId={region.id}
        isCompact
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
      </div>
    </>
  )
}
