import type { ComponentType } from "react"
import { AnalogYearsPreview } from "@/features/landing/previews/analog-years-preview"
import { FarmMapPreview } from "@/features/landing/previews/farm-map-preview"
import { LimitsPreview } from "@/features/landing/previews/limits-preview"
import { RotationComparisonPreview } from "@/features/landing/previews/rotation-comparison-preview"
import { SourceTrailPreview } from "@/features/landing/previews/source-trail-preview"
import type { PreviewId } from "@/features/landing/site-content"

const PREVIEWS: Record<PreviewId, ComponentType<{ className?: string }>> = {
  "analog-years": AnalogYearsPreview,
  "rotation-comparison": RotationComparisonPreview,
  "source-trail": SourceTrailPreview,
  "farm-map": FarmMapPreview,
  limits: LimitsPreview,
}

export function SitePreview({
  id,
  className,
}: {
  id: PreviewId
  className?: string
}) {
  const Preview = PREVIEWS[id]
  return <Preview className={className} />
}
