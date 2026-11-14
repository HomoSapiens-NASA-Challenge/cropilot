import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router"
import { sessionOptions } from "@/features/auth/session"
import { UserMenu } from "@/features/auth/user-menu"

/** Layout of every signed-in page. Routes under `_authenticated/` require a session. */
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionOptions)
    if (!session) {
      throw redirect({ to: "/" })
    }
    return { user: session.user }
  },
  component: AuthenticatedLayout,
})

const NAV_LINK =
  "text-muted-foreground hover:text-foreground aria-[current=page]:text-foreground"

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext()

  return (
    <div className="mx-auto flex min-h-svh max-w-5xl flex-col gap-8 p-6">
      <header className="flex items-center justify-between gap-4">
        <nav className="flex items-center gap-4 text-sm">
          <span className="font-heading font-medium">Cropilot</span>
          <Link to="/dashboard" className={NAV_LINK}>
            Dashboard
          </Link>
          <Link to="/farms" className={NAV_LINK}>
            Farms
          </Link>
        </nav>
        <UserMenu name={user.name} />
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
