import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Outlet } from "@tanstack/react-router"
import { sessionOptions } from "@/features/auth/session"
import { SiteLayout } from "@/features/landing/site-layout"

export const Route = createFileRoute("/_site")({
  loader: ({ context }) => context.queryClient.ensureQueryData(sessionOptions),
  component: SiteRoute,
})

function SiteRoute() {
  const { data: session } = useSuspenseQuery(sessionOptions)

  return (
    <SiteLayout isSignedIn={session !== null}>
      <Outlet />
    </SiteLayout>
  )
}
