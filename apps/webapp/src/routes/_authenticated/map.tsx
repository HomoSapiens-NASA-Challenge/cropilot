import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/page-header"
import { FarmMapViewer } from "@/features/farm-map/farm-map-viewer"
import { appSections } from "@/features/shell/sections"

const section = appSections.farmMap

export const Route = createFileRoute("/_authenticated/map")({
  staticData: { title: section.title },
  component: FarmMapPage,
})

function FarmMapPage() {
  const { region } = Route.useRouteContext()

  return (
    <>
      <PageHeader title={section.title} description={section.description} />
      <FarmMapViewer region={region} />
    </>
  )
}
