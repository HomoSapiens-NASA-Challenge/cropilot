import { CalendarSearch, type LucideIcon, Sprout, Tractor } from "lucide-react"
import { Band, SplitHeading } from "@/features/landing/frame"

const STEPS: ReadonlyArray<{
  icon: LucideIcon
  title: string
  description: string
}> = [
  {
    icon: Tractor,
    title: "Start from the field",
    description:
      "Location, soil and the rotation the farm runs today. The current rotation is always one of the options compared.",
  },
  {
    icon: CalendarSearch,
    title: "Find years like this one",
    description:
      "Past campaigns that started with the same El Niño phase, as it was known at decision time, and similar root-zone soil moisture.",
  },
  {
    icon: Sprout,
    title: "Compare rotations",
    description:
      "How each rotation did in each of those campaigns, named and dated, side by side. No single score hides the spread.",
  },
]

export function HowItWorksSection() {
  return (
    <Band id="how-it-works" className="scroll-mt-18">
      <div className="px-4 pt-20 pb-14 sm:px-6 lg:pt-24">
        <SplitHeading
          lead="From the field to the campaigns that started the same way."
          className="max-w-3xl"
        >
          Cropilot does not predict the weather. It looks back at real campaigns
          that began like this one and shows what happened.
        </SplitHeading>
      </div>
      <ol className="grid border-t md:grid-cols-3 md:divide-x">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="flex flex-col gap-4 px-4 py-10 sm:px-6 lg:py-14"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-10 items-center justify-center rounded-lg border bg-background text-primary">
                <step.icon className="size-5" />
              </span>
              <span className="text-sm text-muted-foreground tabular-nums">
                0{index + 1}
              </span>
            </div>
            <h3 className="mt-2 text-lg font-medium">{step.title}</h3>
            <p className="leading-relaxed text-muted-foreground">
              {step.description}
            </p>
          </li>
        ))}
      </ol>
    </Band>
  )
}
