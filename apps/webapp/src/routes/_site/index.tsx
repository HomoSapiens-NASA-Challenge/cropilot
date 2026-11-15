import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { sessionOptions } from "@/features/auth/session"
import { AgronomistSection } from "@/features/landing/agronomist-section"
import { CampaignSection } from "@/features/landing/campaign-section"
import { ClosingSection } from "@/features/landing/closing-section"
import { DataSection } from "@/features/landing/data-section"
import { FeatureGridSection } from "@/features/landing/feature-grid-section"
import { HeroSection } from "@/features/landing/hero-section"
import { HowItWorksSection } from "@/features/landing/how-it-works-section"
import { SourceStrip } from "@/features/landing/source-strip"
import { StatsSection } from "@/features/landing/stats-section"

export const Route = createFileRoute("/_site/")({
  component: LandingPage,
})

function LandingPage() {
  // Already loaded by the `_site` layout.
  const { data: session } = useSuspenseQuery(sessionOptions)
  const isSignedIn = session !== null

  return (
    <>
      <HeroSection isSignedIn={isSignedIn} />
      <SourceStrip />
      <FeatureGridSection />
      <CampaignSection />
      <StatsSection />
      <HowItWorksSection />
      <DataSection />
      <AgronomistSection />
      <ClosingSection isSignedIn={isSignedIn} />
    </>
  )
}
