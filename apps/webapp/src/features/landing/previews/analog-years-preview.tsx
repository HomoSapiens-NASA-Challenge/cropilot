import { cn } from "cn"
import { Droplets, Waves } from "lucide-react"
import {
  PlaceholderLine,
  PreviewWindow,
} from "@/features/landing/previews/preview-window"

// Positions are decorative: they do not stand for real campaigns.
const CAMPAIGN_TICK_COUNT = 44
const MATCHED_TICKS: ReadonlySet<number> = new Set([6, 17, 18, 29, 37])
const CAMPAIGN_TICKS = Array.from(
  { length: CAMPAIGN_TICK_COUNT },
  (_, index) => index
)
const MATCHED_ROWS = ["first", "second", "third"] as const

export function AnalogYearsPreview({ className }: { className?: string }) {
  return (
    <PreviewWindow title="Years like this" className={className}>
      <div className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border bg-background/70 p-3">
            <Waves className="size-4 shrink-0 text-primary" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="text-xs font-medium">El Niño phase</span>
              <PlaceholderLine className="w-2/3" />
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-background/70 p-3">
            <Droplets className="size-4 shrink-0 text-primary" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="text-xs font-medium">Soil water at start</span>
              <PlaceholderLine className="w-1/2" />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Past campaigns</span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="size-1.5 rounded-full bg-primary" />
              Started like this one
            </span>
          </div>
          <div aria-hidden className="flex h-10 items-end gap-0.75">
            {CAMPAIGN_TICKS.map((tick) => (
              <span
                key={tick}
                className={cn(
                  "flex-1 rounded-full",
                  MATCHED_TICKS.has(tick)
                    ? "h-full bg-primary"
                    : "h-3/5 bg-border"
                )}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col divide-y">
          {MATCHED_ROWS.map((row) => (
            <div key={row} className="flex items-center gap-3 py-2.5">
              <span aria-hidden className="size-1.5 rounded-full bg-primary" />
              <PlaceholderLine className="w-24" />
              <PlaceholderLine className="ml-auto w-16" />
            </div>
          ))}
        </div>
      </div>
    </PreviewWindow>
  )
}
