import { cn } from "cn"
import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/lib/i18n"

/** A preview shows placeholder lines ("Illustrative") or real values from a measured result; its badge then names the source. */
export function PreviewWindow({
  title,
  badge = "Illustrative",
  className,
  bodyClassName = "p-4 sm:p-5",
  children,
}: {
  title: string
  badge?: string
  className?: string
  bodyClassName?: string
  children: ReactNode
}) {
  const { t } = useI18n("landing")
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
        <span className="truncate text-xs text-muted-foreground">
          {t(title)}
        </span>
        <Badge variant="outline" className="ml-auto bg-background/60">
          {t(badge)}
        </Badge>
      </div>
      <div className={bodyClassName}>{children}</div>
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
