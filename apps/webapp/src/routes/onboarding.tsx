import { getWorkspaceOptions, listRegionsOptions } from "@cropilot/api"
import { createFileRoute } from "@tanstack/react-router"
import { requireSession, signOut } from "@/features/auth/session"
import { StrandsArt } from "@/features/landing/strands-art"
import { OnboardingFlow } from "@/features/onboarding/onboarding-flow"
import {
  isOnboardingStepId,
  type OnboardingStepId,
} from "@/features/onboarding/steps"

/** First stop after signing up: a short tour that ends by scoping the workspace to a region. */
export const Route = createFileRoute("/onboarding")({
  validateSearch: (
    search: Record<string, unknown>
  ): { step?: OnboardingStepId } =>
    isOnboardingStepId(search.step) ? { step: search.step } : {},
  beforeLoad: async ({ context }) => {
    const session = await requireSession(context.queryClient)
    return { user: session.user }
  },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(listRegionsOptions()),
      context.queryClient.ensureQueryData(getWorkspaceOptions()),
    ]),
  component: OnboardingPage,
})

function OnboardingPage() {
  const { user } = Route.useRouteContext()
  const { step = "welcome" } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <div className="relative isolate flex min-h-svh flex-col overflow-hidden bg-secondary">
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute -top-48 right-0 size-160 rounded-full bg-primary/10 blur-3xl" />
        <StrandsArt className="absolute inset-0 size-full" />
      </div>
      <OnboardingFlow
        user={user}
        step={step}
        onStepChange={(nextStep) => navigate({ search: { step: nextStep } })}
        onSignOut={signOut}
      />
    </div>
  )
}
