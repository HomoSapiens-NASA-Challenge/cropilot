import type { QueryClient } from "@tanstack/react-query"
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router"
import { RouteProgress } from "@/components/route-progress"
import { LanguageProvider } from "@/lib/i18n"

type RouterContext = {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})

function RootLayout() {
  return (
    <LanguageProvider>
      <RouteProgress />
      <Outlet />
    </LanguageProvider>
  )
}
