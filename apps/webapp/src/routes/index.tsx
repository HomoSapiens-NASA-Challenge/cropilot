import { createFileRoute, redirect } from "@tanstack/react-router"
import { GoogleSignInButton } from "@/features/auth/google-sign-in-button"
import { sessionOptions } from "@/features/auth/session"

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionOptions)
    if (session) {
      throw redirect({ to: "/farms" })
    }
  },
  component: SignInPage,
})

function SignInPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="font-heading text-2xl font-medium">Cropilot</h1>
        <p className="text-muted-foreground">
          Decision support for crop rotation planning.
        </p>
      </div>
      <GoogleSignInButton />
    </main>
  )
}
