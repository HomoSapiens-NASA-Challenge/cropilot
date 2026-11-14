import { listFarmsOptions } from "@cropilot/api"
import { createFileRoute } from "@tanstack/react-router"
import { FarmForm } from "@/features/farms/farm-form"
import { FarmList } from "@/features/farms/farm-list"

export const Route = createFileRoute("/_authenticated/farms")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(listFarmsOptions()),
  component: FarmsPage,
})

function FarmsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <h1 className="font-heading text-xl font-medium">Farms</h1>
      <FarmForm />
      <FarmList />
    </div>
  )
}
