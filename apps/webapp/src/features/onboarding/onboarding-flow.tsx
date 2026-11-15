import {
  getWorkspaceOptions,
  getWorkspaceQueryKey,
  listRegionsOptions,
  type Region,
  saveWorkspaceMutation,
} from "@cropilot/api"
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { cn } from "cn"
import { ArrowLeft, ArrowRight, LogOut } from "lucide-react"
import { type ReactNode, useState } from "react"
import { BrandMark } from "@/components/brand-mark"
import { RegionPicker } from "@/components/region-picker"
import { Button } from "@/components/ui/button"
import {
  ONBOARDING_STEP_IDS,
  ONBOARDING_STEP_LABELS,
  type OnboardingStepId,
} from "@/features/onboarding/steps"
import {
  ReadyStep,
  RotationsStep,
  WelcomeStep,
  YearsLikeThisStep,
} from "@/features/onboarding/tour-steps"

function referenceRegion(regions: ReadonlyArray<Region>): Region {
  const region = regions.find((candidate) => candidate.is_reference_case)
  if (!region) {
    throw new Error("The region catalog has no reference case")
  }
  return region
}

function StepHeading({ index, title }: { index: number; title: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-primary tabular-nums">
        Step {index + 1} of {ONBOARDING_STEP_IDS.length}
      </p>
      <h1 className="text-3xl/10 font-light tracking-tight sm:text-4xl/12">
        {title}
      </h1>
    </div>
  )
}

function StepProgress({ currentIndex }: { currentIndex: number }) {
  return (
    <ol className="grid grid-cols-5 gap-2">
      {ONBOARDING_STEP_IDS.map((stepId, index) => (
        <li
          key={stepId}
          aria-current={index === currentIndex ? "step" : undefined}
          className="flex flex-col gap-2"
        >
          <span
            className={cn(
              "h-1 rounded-lg bg-border transition-colors",
              index <= currentIndex && "bg-primary"
            )}
          />
          <span
            className={cn(
              "hidden text-xs text-muted-foreground sm:block",
              index === currentIndex && "text-foreground"
            )}
          >
            {ONBOARDING_STEP_LABELS[stepId]}
          </span>
        </li>
      ))}
    </ol>
  )
}

export function OnboardingFlow({
  user,
  step,
  onStepChange,
  onSignOut,
}: {
  user: { name: string }
  step: OnboardingStepId
  onStepChange: (step: OnboardingStepId) => void
  onSignOut: () => void
}) {
  const queryClient = useQueryClient()
  const { data: regions } = useSuspenseQuery(listRegionsOptions())
  const { data: workspace } = useSuspenseQuery(getWorkspaceOptions())
  const [selectedRegionId, setSelectedRegionId] = useState(
    () => workspace?.region.id ?? referenceRegion(regions).id
  )
  const saveWorkspace = useMutation({
    ...saveWorkspaceMutation(),
    onSuccess: (savedWorkspace) => {
      queryClient.setQueryData(getWorkspaceQueryKey(), savedWorkspace)
      onStepChange("ready")
    },
  })

  // "Ready" only makes sense once a region is saved.
  const visibleStep = step === "ready" && !workspace ? "region" : step
  const stepIndex = ONBOARDING_STEP_IDS.indexOf(visibleStep)
  const regionStepIndex = ONBOARDING_STEP_IDS.indexOf("region")
  const firstName = user.name.split(" ")[0]

  const goTo = (index: number) => {
    const target = ONBOARDING_STEP_IDS[index]
    if (target) onStepChange(target)
  }

  let content: ReactNode
  switch (visibleStep) {
    case "welcome":
      content = (
        <WelcomeStep
          heading={
            <StepHeading
              index={stepIndex}
              title={`Welcome to Cropilot, ${firstName}`}
            />
          }
        />
      )
      break
    case "years-like-this":
      content = (
        <YearsLikeThisStep
          heading={
            <StepHeading index={stepIndex} title="Years like this one" />
          }
        />
      )
      break
    case "rotations":
      content = (
        <RotationsStep
          heading={
            <StepHeading
              index={stepIndex}
              title="Compare at least three rotations"
            />
          }
        />
      )
      break
    case "region":
      content = (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <StepHeading index={stepIndex} title="Choose your region" />
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Cropilot scopes every analysis to one department: its NASA POWER
              climate cell, its soil and its MAGyP yields. You can change it
              later.
            </p>
          </div>
          <RegionPicker
            regions={regions}
            selectedRegionId={selectedRegionId}
            onSelect={setSelectedRegionId}
          />
        </div>
      )
      break
    case "ready":
      content = workspace && (
        <ReadyStep
          region={workspace.region}
          heading={
            <StepHeading
              index={stepIndex}
              title={`${workspace.region.name} is your region`}
            />
          }
        />
      )
      break
  }

  return (
    <>
      <header className="mx-auto flex w-full max-w-316 items-center justify-between gap-4 px-6 py-5">
        <BrandMark />
        <div className="flex items-center gap-2">
          {stepIndex < regionStepIndex && (
            <Button variant="ghost" onClick={() => goTo(regionStepIndex)}>
              Skip intro
            </Button>
          )}
          {workspace ? (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to="/overview" />}
            >
              Back to Cropilot
            </Button>
          ) : (
            <Button variant="ghost" onClick={onSignOut}>
              <LogOut data-icon="inline-start" />
              Sign out
            </Button>
          )}
        </div>
      </header>
      <main className="flex flex-1 justify-center px-4 pb-16 sm:px-6">
        <div className="flex w-full max-w-5xl flex-col self-start rounded-xl border border-background/80 bg-background/75 shadow-2xl backdrop-blur-lg">
          <div className="border-b px-6 py-5 sm:px-10">
            <StepProgress currentIndex={stepIndex} />
          </div>
          <div
            key={visibleStep}
            className="px-6 py-8 duration-500 animate-in fade-in slide-in-from-bottom-2 sm:px-10 sm:py-10"
          >
            {content}
          </div>
          <footer className="flex items-center justify-between gap-4 border-t px-6 py-4 sm:px-10">
            <Button
              variant="ghost"
              disabled={stepIndex === 0}
              onClick={() => goTo(stepIndex - 1)}
            >
              <ArrowLeft data-icon="inline-start" />
              Back
            </Button>
            <div className="flex flex-col items-end gap-2">
              {visibleStep === "region" ? (
                <Button
                  size="lg"
                  disabled={saveWorkspace.isPending}
                  onClick={() =>
                    saveWorkspace.mutate({
                      body: { region_id: selectedRegionId },
                    })
                  }
                >
                  {saveWorkspace.isPending ? "Saving…" : "Save region"}
                  <ArrowRight data-icon="inline-end" />
                </Button>
              ) : visibleStep === "ready" ? (
                <div className="flex gap-2">
                  <Button
                    size="lg"
                    variant="outline"
                    nativeButton={false}
                    render={<Link to="/map" />}
                  >
                    Open the farm map
                  </Button>
                  <Button
                    size="lg"
                    nativeButton={false}
                    render={<Link to="/overview" />}
                  >
                    Go to overview
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </div>
              ) : (
                <Button size="lg" onClick={() => goTo(stepIndex + 1)}>
                  Continue
                  <ArrowRight data-icon="inline-end" />
                </Button>
              )}
              {saveWorkspace.isError && (
                <p role="alert" className="text-sm text-destructive">
                  Could not save the region. Try again.
                </p>
              )}
            </div>
          </footer>
        </div>
      </main>
    </>
  )
}
