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

/** Built from the `staticData.title` of the matched routes. */
export function AppBreadcrumb() {
  const pageTitle = useMatches({
    select: (matches) =>
      matches.findLast((match) => match.staticData.title)?.staticData.title,
  })

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink render={<Link to={appSections.overview.to} />}>
            Cropilot
          </BreadcrumbLink>
        </BreadcrumbItem>
        {pageTitle && (
          <>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium">
                {pageTitle}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
