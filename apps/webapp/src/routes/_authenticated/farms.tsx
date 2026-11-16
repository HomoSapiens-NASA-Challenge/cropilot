import { listFarmsOptions } from "@cropilot/api"
import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { FarmForm } from "@/features/farms/farm-form"
import { FarmList } from "@/features/farms/farm-list"
import { appSections } from "@/features/shell/sections"
import { useI18n } from "@/lib/i18n"

export const Route = createFileRoute("/_authenticated/farms")({
  staticData: { title: appSections.farms.title },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(listFarmsOptions()),
  component: FarmsPage,
})

function FarmsPage() {
  const { t } = useI18n("app")

  return (
    <>
      <PageHeader
        title={t(appSections.farms.title)}
        description={t(appSections.farms.description)}
      />
      <Card>
        <CardContent className="flex flex-col gap-6">
          <FarmForm />
          <FarmList />
        </CardContent>
      </Card>
    </>
  )
}
