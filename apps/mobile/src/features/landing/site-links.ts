import { router } from "expo-router"

/** Opens one of the public site's pages, the same ones the web serves under /$sectionSlug/$pageSlug. */
export function openSitePage(sectionSlug: string, pageSlug: string): void {
  router.push({
    pathname: "/site/[sectionSlug]/[pageSlug]",
    params: { sectionSlug, pageSlug },
  })
}
