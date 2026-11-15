import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, notFound } from "@tanstack/react-router"
import { publicSessionOptions } from "@/features/auth/session"
import { findSitePage } from "@/features/landing/site-content"
import { SitePageView } from "@/features/landing/site-page"

export const Route = createFileRoute("/_site/$sectionSlug/$pageSlug")({
  // Only the slugs travel through the loader: the page itself holds icons.
  loader: ({ params }) => {
    if (!findSitePage(params.sectionSlug, params.pageSlug)) {
      throw notFound()
    }
  },
  component: SitePageRoute,
})

function SitePageRoute() {
  const { sectionSlug, pageSlug } = Route.useParams()
  // Already loaded by the `_site` layout.
  const { data: session } = useSuspenseQuery(publicSessionOptions)
  const match = findSitePage(sectionSlug, pageSlug)
  if (!match) {
    throw notFound()
  }

  return (
    <SitePageView
      menu={match.menu}
      column={match.column}
      page={match.page}
      isSignedIn={session !== null}
    />
  )
}
