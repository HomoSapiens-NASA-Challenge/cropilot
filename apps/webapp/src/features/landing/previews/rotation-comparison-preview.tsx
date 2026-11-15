import { Sprout } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  PlaceholderLine,
  PreviewWindow,
} from "@/features/landing/previews/preview-window"

const ROTATIONS = [
  { label: "Current rotation", isCurrent: true },
  { label: "Alternative A", isCurrent: false },
  { label: "Alternative B", isCurrent: false },
] as const

const STRATEGY_ANSWERS = [
  "Why",
  "Evidence",
  "Benefits",
  "Missing",
  "Local review",
] as const

export function RotationComparisonPreview({
  className,
}: {
  className?: string
}) {
  return (
    <PreviewWindow title="Strategies" className={className}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col divide-y">
          {ROTATIONS.map((rotation) => (
            <div key={rotation.label} className="flex flex-col gap-2.5 py-3">
              <div className="flex items-center gap-2">
                <Sprout
                  className={
                    rotation.isCurrent
                      ? "size-4 shrink-0 text-primary"
                      : "size-4 shrink-0 text-muted-foreground"
                  }
                />
                <span className="text-sm font-medium">{rotation.label}</span>
                {rotation.isCurrent && (
                  <Badge variant="secondary" className="ml-auto">
                    Today
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <PlaceholderLine />
                <PlaceholderLine />
                <PlaceholderLine />
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STRATEGY_ANSWERS.map((answer) => (
            <Badge key={answer} variant="outline" className="bg-background/60">
              {answer}
            </Badge>
          ))}
        </div>
      </div>
    </PreviewWindow>
  )
}
