import { cn } from "cn"
import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"

/**
 * Glass window that frames a product preview. Previews show the layout of a
 * screen with placeholder lines: they carry no results, real or mock.
 */
export function PreviewWindow({
  title,
  className,
  children,
}: {
  title: string
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-background/80 bg-background/75 shadow-2xl backdrop-blur-lg",
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
          Illustrative
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
