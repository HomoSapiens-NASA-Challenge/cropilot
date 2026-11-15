import { cn } from "cn"
import { cropColor } from "@/lib/data-colors"

/** The color of a crop, as declared once in `lib/data-colors.ts`. Takes any crop label. */
export function CropSwatch({
  crop,
  className,
}: {
  crop: string | null
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2.5 shrink-0 rounded-sm", className)}
      style={{ backgroundColor: cropColor(crop) }}
    />
  )
}
