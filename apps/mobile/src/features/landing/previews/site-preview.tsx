import type { ComponentType } from "react"
import { AnalogYearsPreview } from "@/features/landing/previews/analog-years-preview"
import { AssistantPreview } from "@/features/landing/previews/assistant-preview"
import { FarmMapPreview } from "@/features/landing/previews/farm-map-preview"
import { RotationComparisonPreview } from "@/features/landing/previews/rotation-comparison-preview"
import { SourceTrailPreview } from "@/features/landing/previews/source-trail-preview"
import type { PreviewId } from "@/features/landing/site-content"

const PREVIEWS: Record<PreviewId, ComponentType<{ className?: string }>> = {
  "analog-years": AnalogYearsPreview,
  "rotation-comparison": RotationComparisonPreview,
  "source-trail": SourceTrailPreview,
  "farm-map": FarmMapPreview,
  assistant: AssistantPreview,
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
