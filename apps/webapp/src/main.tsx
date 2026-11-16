import { configureApi } from "@cropilot/api"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { PageLoader } from "@/components/page-loader"
import { getHandle } from "@/features/auth/session"
import { routeTree } from "./routeTree.gen"
import "./index.css"

configureApi({ baseUrl: "", getToken: getHandle })

const queryClient = new QueryClient()

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  // Loaders read through TanStack Query, which owns freshness.
  defaultPreloadStaleTime: 0,
  // The page loader appears only when a route is still loading after a short wait, and then
  // stays long enough not to flash. The top progress bar covers the fast navigations.
  defaultPendingComponent: PageLoader,
  defaultPendingMs: 300,
  defaultPendingMinMs: 400,
  // A new page opens at the top; going back restores where the reader was.
  scrollRestoration: true,
  // Links to a section glide to it, unless the reader asked for reduced motion.
  defaultHashScrollIntoView: window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches
    ? true
    : { behavior: "smooth" },
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
  interface StaticDataRouteOption {
    /** Shown in the breadcrumb of the app shell. */
    title?: string
  }
}

const root = document.getElementById("root")
if (!root) {
  throw new Error("Missing #root element")
}

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
)
