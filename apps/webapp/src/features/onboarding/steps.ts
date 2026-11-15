export const ONBOARDING_STEP_IDS = [
  "welcome",
  "years-like-this",
  "rotations",
  "region",
  "ready",
] as const

export type OnboardingStepId = (typeof ONBOARDING_STEP_IDS)[number]

export const ONBOARDING_STEP_LABELS: Record<OnboardingStepId, string> = {
  welcome: "Welcome",
  "years-like-this": "Years like this",
  rotations: "Rotations",
  region: "Region",
  ready: "Ready",
}

export function isOnboardingStepId(value: unknown): value is OnboardingStepId {
  return ONBOARDING_STEP_IDS.some((stepId) => stepId === value)
}
