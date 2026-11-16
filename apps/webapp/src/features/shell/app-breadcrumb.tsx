import { Link, useMatches } from "@tanstack/react-router"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { appSections } from "@/features/shell/sections"
import { useI18n } from "@/lib/i18n"

/** Built from the `staticData.title` of the matched routes. */
export function AppBreadcrumb() {
  const { t } = useI18n("app")

  const pageTitle = useMatches({
    select: (matches) =>
      matches.findLast((match) => match.staticData.title)?.staticData.title,
  })

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink render={<Link to={appSections.overview.to} />}>
            {t("Cropilot")}
          </BreadcrumbLink>
        </BreadcrumbItem>
        {pageTitle && (
          <>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium">
                {t(pageTitle)}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
