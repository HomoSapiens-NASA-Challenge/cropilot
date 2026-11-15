import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { sessionOptions, signOut } from "@/features/auth/session"
import { AppBreadcrumb } from "@/features/shell/app-breadcrumb"
import { AppSidebar } from "@/features/shell/app-sidebar"

/** Layout of every signed-in page. Routes under `_authenticated/` require a session. */
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionOptions)
    if (!session) {
      throw redirect({ to: "/login" })
    }
    return { user: session.user }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext()

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar user={user} onSignOut={signOut} />
        <SidebarInset className="bg-secondary">
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/75 px-4 backdrop-blur-lg">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-center"
            />
            <AppBreadcrumb />
          </header>
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 p-6 md:p-10">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
