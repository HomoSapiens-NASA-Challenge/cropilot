import { cn } from "cn"
import { Sprout } from "lucide-react"

export function BrandLogo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground",
        className
      )}
    >
      <Sprout className="size-4" />
    </div>
  )
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-lg font-medium tracking-tight",
        className
      )}
    >
      <BrandLogo />
      Cropilot
    </span>
  )
}
