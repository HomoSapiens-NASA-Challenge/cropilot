import { createFileRoute } from "@tanstack/react-router"
import { ComingSoon } from "@/components/coming-soon"
import { PageHeader } from "@/components/page-header"
import { appSections } from "@/features/shell/sections"

const section = appSections.strategies

export const Route = createFileRoute("/_authenticated/strategies")({
  staticData: { title: section.title },
  component: StrategiesPage,
})

function StrategiesPage() {
  return (
    <>
      <PageHeader title={section.title} description={section.description} />
      <ComingSoon
        icon={section.icon}
        title="No strategies to compare yet"
        description="Each strategy will show why it is suggested, the evidence behind it, its benefits, what information is missing and which risks need local review."
      />
    </>
  )
}
