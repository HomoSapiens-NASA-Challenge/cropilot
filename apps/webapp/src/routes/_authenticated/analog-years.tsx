import { createFileRoute } from "@tanstack/react-router"
import { ComingSoon } from "@/components/coming-soon"
import { PageHeader } from "@/components/page-header"
import { appSections } from "@/features/shell/sections"

const section = appSections.analogYears

export const Route = createFileRoute("/_authenticated/analog-years")({
  staticData: { title: section.title },
  component: AnalogYearsPage,
})

function AnalogYearsPage() {
  return (
    <>
      <PageHeader title={section.title} description={section.description} />
      <ComingSoon
        icon={section.icon}
        title="No campaigns to show yet"
        description="Pick a farm and Cropilot will list the past campaigns that started with the same El Niño phase (NOAA ONI) and similar root-zone soil moisture (NASA POWER), each with its name and dates."
      />
    </>
  )
}
