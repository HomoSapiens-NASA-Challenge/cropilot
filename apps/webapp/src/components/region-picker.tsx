import type { Region } from "@cropilot/api"
import { cn } from "cn"
import { TriangleAlert } from "lucide-react"
import { useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Map as BaseMap,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerLabel,
  useMap,
} from "@/components/ui/map"

const MAP_PADDING_PX = 48

/** Frames every region once the map is ready, whatever the size of its container. */
function FitRegions({ regions }: { regions: ReadonlyArray<Region> }) {
  const { map, isLoaded } = useMap()

  useEffect(() => {
    if (!map || !isLoaded || regions.length === 0) return
    const longitudes = regions.map((region) => region.longitude_deg)
    const latitudes = regions.map((region) => region.latitude_deg)
    map.fitBounds(
      [
        [Math.min(...longitudes), Math.min(...latitudes)],
        [Math.max(...longitudes), Math.max(...latitudes)],
      ],
      { padding: MAP_PADDING_PX, duration: 0 }
    )
  }, [map, isLoaded, regions])

  return null
}

/** The region catalog as a list and a map; picking either one selects the region. */
export function RegionPicker({
  regions,
  selectedRegionId,
  onSelect,
}: {
  regions: ReadonlyArray<Region>
  selectedRegionId: string
  onSelect: (regionId: string) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <ul
          aria-label="Regions"
          className="flex max-h-104 flex-col gap-2 overflow-y-auto pr-1"
        >
          {regions.map((region) => {
            const isSelected = region.id === selectedRegionId
            return (
              <li key={region.id}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(region.id)}
                  className={cn(
                    "flex w-full flex-col gap-1 rounded-lg border bg-background px-3 py-2.5 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected &&
                      "border-primary bg-primary/5 hover:bg-primary/5"
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {region.name}
                    {region.is_reference_case && (
                      <Badge variant="outline" className="font-normal">
                        Reference case
                      </Badge>
                    )}
                    {region.known_limit && (
                      <TriangleAlert
                        aria-label="Known limit"
                        className="ml-auto size-3.5 text-muted-foreground"
                      />
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {region.province}
                  </span>
                  {isSelected && region.known_limit && (
                    <span className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {region.known_limit}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
        <div className="relative h-104 overflow-hidden rounded-xl border">
          <BaseMap theme="light" center={[-62, -32]} zoom={4}>
            {regions.map((region) => {
              const isSelected = region.id === selectedRegionId
              return (
                <MapMarker
                  key={region.id}
                  longitude={region.longitude_deg}
                  latitude={region.latitude_deg}
                  onClick={() => onSelect(region.id)}
                >
                  <MarkerContent>
                    <span
                      title={`${region.name}, ${region.province}`}
                      data-selected={isSelected}
                      className="block size-3 rounded-full border-2 border-background bg-muted-foreground shadow-sm transition-all data-[selected=true]:size-4 data-[selected=true]:bg-primary"
                    />
                    {isSelected && (
                      <MarkerLabel className="rounded-lg bg-background px-1.5 py-0.5 text-xs shadow-sm">
                        {region.name}
                      </MarkerLabel>
                    )}
                  </MarkerContent>
                </MapMarker>
              )
            })}
            <FitRegions regions={regions} />
            <MapControls position="bottom-right" />
          </BaseMap>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Each region is anchored on one rural SoilGrids pixel of the department,
        picked by the team. These reference points are not surveyed fields.
      </p>
    </div>
  )
}
