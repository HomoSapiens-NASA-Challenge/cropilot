import { getWorkspaceOptions, listRegionsOptions } from "@cropilot/api"
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { LanguageSelector } from "@/components/language-selector"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { requireSession, signOut } from "@/features/auth/session"
import { AppAssistant } from "@/features/shell/app-assistant"
import { AppBreadcrumb } from "@/features/shell/app-breadcrumb"
import { AppSidebar } from "@/features/shell/app-sidebar"

/**
 * Layout of every signed-in page. Routes under `_authenticated/` require a session
 * and a workspace region; without a region the reader goes through onboarding first.
 */
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context }) => {
    const session = await requireSession(context.queryClient)
    const workspace = await context.queryClient.ensureQueryData(
      getWorkspaceOptions()
    )
    if (!workspace) {
      throw redirect({ to: "/onboarding" })
    }
    return { user: session.user, region: workspace.region }
  },
  // The region switcher reads the catalog; it is tiny and static, so it loads with the shell.
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(listRegionsOptions()),
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { user, region } = Route.useRouteContext()

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar user={user} region={region} onSignOut={signOut} />
        <SidebarInset className="bg-secondary">
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/75 px-4 backdrop-blur-lg">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-center"
            />
            <AppBreadcrumb />
            <div className="ml-auto">
              <LanguageSelector />
            </div>
          </header>
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 p-6 md:p-10">
            <AppAssistant region={region}>
              <Outlet />
            </AppAssistant>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
