import { cn } from "cn"
import { ChevronRight } from "lucide-react"
import { CropMixBar } from "@/features/farm-map/crop-swatch"
import { formatHectares } from "@/features/farm-map/format"
import {
  cropMix,
  type DemoFarm,
} from "@/features/farm-map/synthetic-demo-farms"

export function FarmList({
  farms,
  hoveredFarmId,
  onHoverFarm,
  onSelectFarm,
}: {
  farms: ReadonlyArray<DemoFarm>
  hoveredFarmId: string | null
  onHoverFarm: (farmId: string | null) => void
  onSelectFarm: (farmId: string) => void
}) {
  return (
    <ul className="flex flex-col gap-1 p-2">
      {farms.map((farm) => (
        <li key={farm.farmId}>
          <button
            type="button"
            data-hovered={farm.farmId === hoveredFarmId}
            className={cn(
              "group/farm flex w-full flex-col gap-2.5 rounded-lg px-3 py-3 text-left transition-colors outline-none",
              "hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring data-[hovered=true]:bg-sidebar-accent"
            )}
            onMouseEnter={() => onHoverFarm(farm.farmId)}
            onMouseLeave={() => onHoverFarm(null)}
            onFocus={() => onHoverFarm(farm.farmId)}
            onBlur={() => onHoverFarm(null)}
            onClick={() => onSelectFarm(farm.farmId)}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-medium">{farm.name}</span>
              <ChevronRight className="size-4 text-primary opacity-0 transition-all group-hover/farm:translate-x-0.5 group-hover/farm:opacity-100 group-data-[hovered=true]/farm:opacity-100" />
            </span>
            <span className="text-xs text-muted-foreground">
              {formatHectares(farm.areaHa)} · {farm.lots.length} lots ·{" "}
              {farm.rotation}
            </span>
            <CropMixBar mix={cropMix(farm)} />
          </button>
        </li>
      ))}
    </ul>
  )
}
