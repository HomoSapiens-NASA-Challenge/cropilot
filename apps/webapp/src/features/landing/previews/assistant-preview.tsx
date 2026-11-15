import { Badge } from "@/components/ui/badge"
import {
  PlaceholderLine,
  PreviewWindow,
} from "@/features/landing/previews/preview-window"

const CITED_SOURCES = ["NASA POWER · GWETROOT", "NOAA · ONI"] as const

export function AssistantPreview({ className }: { className?: string }) {
  return (
    <PreviewWindow title="Assistant" className={className}>
      <div className="flex flex-col gap-3">
        <p className="ml-auto max-w-4/5 rounded-xl rounded-br-xs bg-primary px-3 py-2 text-sm text-primary-foreground">
          Why is this rotation suggested?
        </p>
        <div className="flex max-w-11/12 flex-col gap-2.5 rounded-xl rounded-bl-xs border bg-background/70 px-3 py-3">
          <PlaceholderLine />
          <PlaceholderLine className="w-5/6" />
          <PlaceholderLine className="w-2/3" />
          <div className="flex flex-wrap gap-1.5 pt-1">
            {CITED_SOURCES.map((source) => (
              <Badge key={source} variant="outline">
                {source}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </PreviewWindow>
  )
}
