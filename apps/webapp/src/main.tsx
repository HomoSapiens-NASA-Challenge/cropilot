import { configureApi } from "@cropilot/api"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { accessToken } from "@/lib/auth"
import { routeTree } from "./routeTree.gen"
import "./index.css"

configureApi({ baseUrl: "", getToken: accessToken.get })

const queryClient = new QueryClient()

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  // Loaders read through TanStack Query, which owns freshness.
  defaultPreloadStaleTime: 0,
  // A new page opens at the top; going back restores where the reader was.
  scrollRestoration: true,
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
