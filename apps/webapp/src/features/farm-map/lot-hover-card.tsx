import type { MapMouseEvent } from "maplibre-gl"
import { useEffect, useState } from "react"
import { useMap } from "@/components/ui/map"
import { CropSwatch } from "@/features/farm-map/crop-swatch"
import { CROPS } from "@/features/farm-map/crops"
import { formatHectares } from "@/features/farm-map/format"
import type { DemoLot } from "@/features/farm-map/synthetic-demo-farms"

const CURSOR_OFFSET_PX = 16

/** Follows the cursor while a lot is hovered. Never takes pointer events, so it cannot steal the hover. */
export function LotHoverCard({
  lot,
  farmName,
}: {
  lot: DemoLot | null
  farmName: string | undefined
}) {
  const { map } = useMap()
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!map) return
    const handleMove = (event: MapMouseEvent) =>
      setCursor({ x: event.point.x, y: event.point.y })
    map.on("mousemove", handleMove)
    return () => {
      map.off("mousemove", handleMove)
    }
  }, [map])

  if (!lot || !cursor) return null

  return (
    <div
      className="pointer-events-none absolute top-0 left-0 z-20 min-w-48 rounded-lg bg-background/75 px-3 py-2.5 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/10 backdrop-blur-lg duration-150 animate-in fade-in-0 zoom-in-95"
      style={{
        transform: `translate(${cursor.x + CURSOR_OFFSET_PX}px, ${cursor.y + CURSOR_OFFSET_PX}px)`,
      }}
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-medium">{lot.name}</span>
        <span className="text-xs text-muted-foreground">{farmName}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-4">
        <span className="flex items-center gap-2">
          <CropSwatch crop={lot.crop} />
          {CROPS[lot.crop].label}
        </span>
        <span className="font-medium tabular-nums">
          {formatHectares(lot.areaHa)}
        </span>
      </div>
      <p className="mt-2 text-[0.65rem] text-muted-foreground">
        Synthetic demo data · click to open the farm
      </p>
    </div>
  )
}
