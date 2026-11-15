import type { CaseBundle, Region } from "@cropilot/api"
import type { ReactNode } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { HideBlockHeaders, NotAvailable } from "@/features/case/block-frame"

/** The sentence under "Not available for this region yet". It carries no figure. */
export function RegionWithoutCase({ region }: { region: Region }) {
  return (
    <NotAvailable
      description={`${region.name} has no 2026/27 case yet. Change the region in the sidebar to open one that has.`}
    />
  )
}

/**
 * Body of an app screen scoped to the workspace region. Without a case for the region it
 * shows the empty state and no numbers; with one, the screen's block under its page header.
 */
export function RegionCaseScreen({
  bundle,
  region,
  children,
}: {
  bundle: CaseBundle | null
  region: Region
  children: (bundle: CaseBundle) => ReactNode
}) {
  if (!bundle) {
    return <RegionWithoutCase region={region} />
  }
  return (
    <TooltipProvider>
      <HideBlockHeaders>{children(bundle)}</HideBlockHeaders>
    </TooltipProvider>
  )
}
