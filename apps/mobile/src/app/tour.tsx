import { AgronomistSection } from "@/features/landing/agronomist-section"
import { CampaignSection } from "@/features/landing/campaign-section"
import { ClosingSection } from "@/features/landing/closing-section"
import { DataSection } from "@/features/landing/data-section"
import { FeatureGridSection } from "@/features/landing/feature-grid-section"
import { HowItWorksSection } from "@/features/landing/how-it-works-section"
import { SiteScreen } from "@/features/landing/site-screen"
import { AnchorTarget } from "@/features/landing/site-scroll"
import { SourceStrip } from "@/features/landing/source-strip"
import { StatsSection } from "@/features/landing/stats-section"

export default function TourScreen() {
  return (
    <SiteScreen>
      <SourceStrip />
      <AnchorTarget anchor="features">
        <FeatureGridSection />
      </AnchorTarget>
      <CampaignSection />
      <StatsSection />
      <AnchorTarget anchor="how-it-works">
        <HowItWorksSection />
      </AnchorTarget>
      <AnchorTarget anchor="data">
        <DataSection />
      </AnchorTarget>
      <AnchorTarget anchor="agronomists">
        <AgronomistSection />
      </AnchorTarget>
      <ClosingSection />
    </SiteScreen>
  )
}
