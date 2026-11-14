import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
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

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext()

  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col gap-8 p-6">
      <header className="flex items-center justify-between">
        <span className="font-heading font-medium">Cropilot</span>
        <UserMenu name={user.name} />
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
