import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { AssistantPanel } from "@/components/assistant-panel"
import { CaseNotFound, CasePage } from "@/features/case/case-page"
import { caseIndexOptions, zoneCaseOptions } from "@/features/case/case-queries"

/** The public case of one zone: no sign-in, read-only. */
export const Route = createFileRoute("/_site/case/$zoneId")({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(caseIndexOptions),
      context.queryClient.ensureQueryData(zoneCaseOptions(params.zoneId)),
    ])
  },
  component: CaseRoute,
})

function CaseRoute() {
  const { zoneId } = Route.useParams()
  const { data: index } = useSuspenseQuery(caseIndexOptions)
  const { data: bundle } = useSuspenseQuery(zoneCaseOptions(zoneId))

  if (!bundle) {
    return <CaseNotFound zoneId={zoneId} />
  }
  return (
    <>
      <div className="fixed right-4 bottom-4 z-40 rounded-lg bg-background shadow-lg">
        <AssistantPanel
          key={zoneId}
          zoneId={zoneId}
          zoneName={bundle.zone_name}
        />
      </div>
      <CasePage index={index} bundle={bundle} />
    </>
  )
}
