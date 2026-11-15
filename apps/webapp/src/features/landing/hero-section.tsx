import { AppEntryLink, CtaLink } from "@/features/landing/cta-link"
import { Band, SplitHeading } from "@/features/landing/frame"
import { StrandsArt } from "@/features/landing/strands-art"

export function HeroSection({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <Band className="relative isolate overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute -top-48 right-0 size-160 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-24 right-96 size-120 rounded-full bg-accent blur-3xl" />
        <StrandsArt className="absolute inset-0 hidden size-full translate-x-28 opacity-40 motion-safe:animate-strand-drift md:block xl:opacity-100" />
      </div>
      <div className="flex flex-col items-start gap-10 px-4 pt-24 pb-28 sm:px-6 lg:px-30 lg:pt-32 lg:pb-36">
        <p className="text-sm">
          <span className="font-medium">Evidence for the agronomist,</span>{" "}
          <span className="text-muted-foreground">not a forecast</span>
        </p>
        <SplitHeading
          as="h1"
          lead="Plan rotations with the years that looked like this one."
          className="max-w-4xl text-3xl/9 sm:text-5xl/14"
        >
          Cropilot finds the past campaigns that started like the current one,
          by El Niño phase and soil moisture, and shows how each crop rotation
          did in them.
        </SplitHeading>
        <div className="flex flex-wrap items-center gap-2">
          <AppEntryLink isSignedIn={isSignedIn} signedOutLabel="Get started" />
          <CtaLink to="/" hash="how-it-works" variant="outline">
            See how it works
          </CtaLink>
        </div>
      </div>
    </Band>
  )
}
