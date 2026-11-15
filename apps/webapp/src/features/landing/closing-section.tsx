import { Database, type LucideIcon, Tractor } from "lucide-react"
import { AppEntryLink, ArrowLink, CtaLink } from "@/features/landing/cta-link"
import { Band } from "@/features/landing/frame"

const NEXT_STEPS: ReadonlyArray<{
  icon: LucideIcon
  title: string
  description: string
  linkLabel: string
  sectionSlug: string
  pageSlug: string
}> = [
  {
    icon: Database,
    title: "See what it reads",
    description:
      "Two open signals: soil water from NASA POWER and the NOAA Oceanic Niño Index.",
    linkLabel: "About the data",
    sectionSlug: "data",
    pageSlug: "nasa-power",
  },
  {
    icon: Tractor,
    title: "Start from a farm",
    description:
      "Every comparison starts from a field and the rotation it runs today.",
    linkLabel: "Farm map",
    sectionSlug: "features",
    pageSlug: "farm-map",
  },
]

export function ClosingSection({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <Band tone="tinted" frameClassName="border-t">
      <div className="grid gap-14 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-24 lg:py-24">
        <div className="flex flex-col items-start gap-5">
          <h2 className="text-3xl font-light tracking-tight">
            Ready to get started?
          </h2>
          <p className="max-w-md text-xl font-light text-muted-foreground">
            Sign in with Google and add your first farm.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <AppEntryLink isSignedIn={isSignedIn} signedOutLabel="Start now" />
            <CtaLink to="/" hash="how-it-works" variant="outline">
              See how it works
            </CtaLink>
          </div>
        </div>
        <ul className="grid gap-10 sm:grid-cols-2">
          {NEXT_STEPS.map((step) => (
            <li key={step.title} className="flex flex-col items-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg border bg-background text-primary">
                <step.icon className="size-5" />
              </span>
              <h3 className="mt-2 font-medium">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
              <ArrowLink
                to="/$sectionSlug/$pageSlug"
                params={{
                  sectionSlug: step.sectionSlug,
                  pageSlug: step.pageSlug,
                }}
              >
                {step.linkLabel}
              </ArrowLink>
            </li>
          ))}
        </ul>
      </div>
    </Band>
  )
}
