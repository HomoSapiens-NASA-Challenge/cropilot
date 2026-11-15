import type { PriorityWeights, Region, RotationPlanSetup } from "@cropilot/api"
import { cn } from "cn"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LoaderCircle,
  Play,
  X,
} from "lucide-react"
import { type FormEvent, type KeyboardEvent, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { totalWeight } from "@/features/planner/planner-outcomes"
import type { Situation } from "@/features/planner/planner-situation"
import { WizardHorizonStep } from "@/features/planner/wizard-horizon-step"
import { WizardPrioritiesStep } from "@/features/planner/wizard-priorities-step"
import { WizardStartStep } from "@/features/planner/wizard-start-step"

const STEPS = [
  {
    id: 1,
    label: "Starting point",
    lead: "Where the campaign starts: soil water and the El Niño phase you want to read the plan for.",
  },
  {
    id: 2,
    label: "Priorities",
    lead: "What matters on this farm. The planner finds the best rotation for these priorities.",
  },
  {
    id: 3,
    label: "Horizon and review",
    lead: "How far ahead each decision looks, and a last check before the run.",
  },
] as const

type StepId = (typeof STEPS)[number]["id"]

const LAST_STEP: StepId = 3

function stepOf(position: number): StepId {
  if (position <= 1) return 1
  return position >= LAST_STEP ? LAST_STEP : 2
}

/** Numbered steps; those already reached can be clicked to go back (or forward again). */
function Stepper({
  step,
  reached,
  onStep,
}: {
  step: StepId
  reached: StepId
  onStep: (step: StepId) => void
}) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
      {STEPS.map((entry, index) => {
        const isCurrent = entry.id === step
        const isDone = entry.id < step
        const isReachable = entry.id <= reached
        return (
          <li key={entry.id} className="flex items-center gap-2">
            {index > 0 && (
              <span
                aria-hidden
                className={cn(
                  "hidden h-px w-6 sm:block",
                  entry.id <= reached ? "bg-primary" : "bg-border"
                )}
              />
            )}
            <button
              type="button"
              disabled={!isReachable}
              aria-current={isCurrent ? "step" : undefined}
              onClick={() => onStep(entry.id)}
              className="group/step flex items-center gap-2 rounded-lg py-1 pr-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed"
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border text-xs font-medium tabular-nums transition-colors motion-reduce:transition-none",
                  isCurrent &&
                    "border-primary bg-primary text-primary-foreground",
                  isDone && "border-primary text-primary",
                  !isCurrent && !isDone && "text-muted-foreground"
                )}
              >
                {isDone ? <Check className="size-3.5" /> : entry.id}
              </span>
              <span
                className={cn(
                  "text-sm",
                  isCurrent ? "font-medium" : "text-muted-foreground",
                  isReachable &&
                    !isCurrent &&
                    "group-hover/step:text-foreground"
                )}
              >
                {entry.label}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Three steps in one card: where the campaign starts, what matters, and how far ahead to plan.
 * Enter advances; the last step runs the planner. Step 1 only chooses what the results are read
 * for, so the run request holds the priorities and the horizon alone.
 */
export function PlannerWizard({
  region,
  setup,
  situation,
  onSituationChange,
  weights,
  onWeightsChange,
  horizon,
  onHorizonChange,
  isStarting,
  isReopened,
  onRun,
  onClose,
}: {
  region: Region
  setup: RotationPlanSetup
  situation: Situation
  onSituationChange: (situation: Situation) => void
  weights: PriorityWeights
  onWeightsChange: (weights: PriorityWeights) => void
  horizon: number
  onHorizonChange: (horizon: number) => void
  isStarting: boolean
  /** Opened again from the setup bar: every step is reachable and it can be closed. */
  isReopened: boolean
  onRun: () => void
  onClose: () => void
}) {
  const [step, setStep] = useState<StepId>(1)
  const [reached, setReached] = useState<StepId>(isReopened ? LAST_STEP : 1)
  const titleRef = useRef<HTMLDivElement>(null)

  const current = STEPS.find((entry) => entry.id === step) ?? STEPS[0]
  const hasPriority = totalWeight(weights) > 0
  const canContinue = step !== 2 || hasPriority
  const isLast = step === LAST_STEP

  const goTo = (next: StepId) => {
    // The title stays mounted, so it keeps focus inside the form while the step changes and
    // Enter goes on advancing after the control that had focus unmounts.
    titleRef.current?.focus()
    setStep(next)
    setReached((previous) => stepOf(Math.max(previous, next)))
  }

  const advance = () => {
    if (isLast) {
      if (hasPriority && !isStarting) onRun()
      return
    }
    if (canContinue) goTo(stepOf(step + 1))
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    advance()
  }

  // Enter on a slider or a radio advances too; on a button it keeps its own meaning.
  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter" || event.defaultPrevented) return
    if (
      event.target instanceof HTMLElement &&
      event.target.closest("button, a, summary")
    ) {
      return
    }
    event.preventDefault()
    advance()
  }

  return (
    <Card className="sm:[--card-spacing:--spacing(6)]">
      <form onSubmit={onSubmit} onKeyDown={onKeyDown} className="contents">
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <Stepper step={step} reached={reached} onStep={goTo} />
            {isReopened && (
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                <X aria-hidden data-icon="inline-start" />
                Close
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-1 border-t pt-4">
            <CardTitle ref={titleRef} tabIndex={-1} className="outline-none">
              Step {current.id} of {STEPS.length}: {current.label}
            </CardTitle>
            <CardDescription className="max-w-3xl">
              {current.lead}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {step === 1 && (
            <WizardStartStep
              region={region}
              setup={setup}
              situation={situation}
              onSituationChange={onSituationChange}
            />
          )}
          {step === 2 && (
            <WizardPrioritiesStep
              weights={weights}
              onWeightsChange={onWeightsChange}
            />
          )}
          {step === 3 && (
            <WizardHorizonStep
              setup={setup}
              situation={situation}
              weights={weights}
              horizon={horizon}
              onHorizonChange={onHorizonChange}
            />
          )}
        </CardContent>

        <CardFooter className="justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={step === 1}
            onClick={() => goTo(stepOf(step - 1))}
          >
            <ArrowLeft aria-hidden data-icon="inline-start" />
            Back
          </Button>
          {isLast ? (
            <Button type="submit" disabled={!hasPriority || isStarting}>
              {isStarting ? (
                <LoaderCircle
                  aria-hidden
                  data-icon="inline-start"
                  className="animate-spin motion-reduce:animate-none"
                />
              ) : (
                <Play aria-hidden data-icon="inline-start" />
              )}
              {isStarting ? "Starting" : "Run planner"}
            </Button>
          ) : (
            <Button type="submit" disabled={!canContinue}>
              Continue
              <ArrowRight aria-hidden data-icon="inline-end" />
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  )
}
