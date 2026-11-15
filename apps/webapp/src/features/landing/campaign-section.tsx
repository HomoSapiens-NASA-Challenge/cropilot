import { CtaLink } from "@/features/landing/cta-link"
import { Band } from "@/features/landing/frame"
import { StrandsArt } from "@/features/landing/strands-art"

export function CampaignSection() {
  return (
    <Band>
      <div className="px-4 py-20 sm:px-6">
        <div className="relative isolate flex min-h-96 flex-col items-start justify-between gap-10 overflow-hidden rounded-xl bg-inverse p-8 text-inverse-foreground sm:p-12">
          <StrandsArt
            tone="inverse"
            className="absolute inset-0 -z-10 size-full opacity-40 sm:opacity-100"
          />
          <h2 className="max-w-xl text-4xl/11 font-light tracking-tight text-balance sm:text-5xl/14">
            Plan the 2026/27 campaign with the years that started like it
          </h2>
          <CtaLink
            to="/$sectionSlug/$pageSlug"
            params={{ sectionSlug: "features", pageSlug: "years-like-this" }}
            variant="light"
            withChevron
          >
            See years like this
          </CtaLink>
        </div>
      </div>
    </Band>
  )
}
