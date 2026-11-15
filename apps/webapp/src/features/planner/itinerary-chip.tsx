import type { Itinerary } from "@cropilot/api"
import { cn } from "cn"
import {
  ACTION_CROP,
  ACTION_LABEL,
  ACTION_SHORT,
} from "@/features/planner/planner-format"
import { CROPS } from "@/lib/data-colors"

/**
 * Itineraries of a repeating cycle with a stable key: the crops plus how many times the same
 * pair already appeared before, since a cycle can repeat a pair without being shorter.
 */
export function keyedItineraries(
  itineraries: ReadonlyArray<Itinerary>
): Array<{ key: string; itinerary: Itinerary }> {
  const seen = new Map<string, number>()
  return itineraries.map((itinerary) => {
    const pair = `${itinerary.winter}-${itinerary.summer}`
    const occurrence = seen.get(pair) ?? 0
    seen.set(pair, occurrence + 1)
    return { key: `${pair}-${occurrence}`, itinerary }
  })
}

function CropBlock({ action }: { action: Itinerary["winter"] }) {
  return (
    <span
      className="flex h-4 items-center justify-center rounded-sm text-[10px] font-medium text-foreground"
      style={{ backgroundColor: CROPS[ACTION_CROP[action]].color }}
    >
      {ACTION_SHORT[action]}
    </span>
  )
}

/** One campaign's crops as two stacked blocks, winter above summer, each in its crop color. */
export function ItineraryChip({
  itinerary,
  className,
}: {
  itinerary: Itinerary
  className?: string
}) {
  return (
    <span
      role="img"
      aria-label={`Winter ${ACTION_LABEL[itinerary.winter]}, summer ${ACTION_LABEL[itinerary.summer]}`}
      className={cn("flex flex-col gap-px", className)}
    >
      <CropBlock action={itinerary.winter} />
      <CropBlock action={itinerary.summer} />
    </span>
  )
}
