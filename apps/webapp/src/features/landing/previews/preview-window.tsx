import { cn } from "cn"
import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"

/**
 * Window that frames a product preview. A preview either shows the layout of a screen
 * with placeholder lines ("Illustrative", no results, real or mock) or carries real
 * values copied from a measured result, and then its badge names where they come from.
 */
export function PreviewWindow({
  title,
  badge = "Illustrative",
  className,
  children,
}: {
  title: string
  badge?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-background/80 bg-background shadow-2xl",
        className
      )}
    >
      <div className="flex items-center gap-3 border-b border-border/70 px-4 py-2.5">
        <span aria-hidden className="flex gap-1.5">
          <span className="size-2 rounded-full bg-border" />
          <span className="size-2 rounded-full bg-border" />
          <span className="size-2 rounded-full bg-border" />
        </span>
        <span className="truncate text-xs text-muted-foreground">{title}</span>
        <Badge variant="outline" className="ml-auto bg-background/60">
          {badge}
        </Badge>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  )
}

/** Stands in for a value or a sentence that the preview does not make up. */
export function PlaceholderLine({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("block h-2 rounded-full bg-border", className)}
    />
  )
}
