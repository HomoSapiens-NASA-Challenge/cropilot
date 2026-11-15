import type { ZoneCard } from "@cropilot/api"
import { useNavigate } from "@tanstack/react-router"
import { cn } from "cn"
import { useEffect } from "react"
import {
  Map as BaseMap,
  MapControls,
  MapMarker,
  MarkerContent,
  useMap,
} from "@/components/ui/map"
import { accentScale } from "@/lib/data-colors"
import { pointsBounds } from "@/lib/geo"

const MAP_PADDING_PX = 56
const MAX_ZOOM = 6

/** Frames every zone once the map is ready, whatever the size of its container. */
function FitZones({ zones }: { zones: ReadonlyArray<ZoneCard> }) {
  const { map, isLoaded } = useMap()

  useEffect(() => {
    if (!map || !isLoaded || zones.length === 0) return
    map.fitBounds(
      pointsBounds(
        zones.map((zone) => [zone.longitude_deg, zone.latitude_deg])
      ),
      { padding: MAP_PADDING_PX, duration: 0, maxZoom: MAX_ZOOM }
    )
  }, [map, isLoaded, zones])

  return null
}

/** Soil wetness percentile as one accent scale; a zone with no value is a hollow dot. */
export function ZoneDot({
  percentile,
  className,
}: {
  percentile: number | null
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "block size-5 rounded-full border-2 border-background ring-1 ring-foreground/30",
        percentile === null &&
          "border-dashed border-foreground/40 bg-background",
        className
      )}
      style={
        percentile === null
          ? undefined
          : { backgroundColor: accentScale(percentile) }
      }
    />
  )
}

/** The zones with a case on a map of Argentina. A click opens that zone's case. */
export function NationalMap({
  zones,
  selectedZoneId,
  className,
}: {
  zones: ReadonlyArray<ZoneCard>
  selectedZoneId?: string
  className?: string
}) {
  const navigate = useNavigate()

  return (
    <div
      className={cn(
        "relative h-88 overflow-hidden rounded-xl border bg-secondary md:h-112",
        className
      )}
    >
      <BaseMap theme="light" center={[-62, -33]} zoom={4}>
        {zones.map((zone) => (
          <MapMarker
            key={zone.zone_id}
            longitude={zone.longitude_deg}
            latitude={zone.latitude_deg}
            onClick={() =>
              navigate({
                to: "/case/$zoneId",
                params: { zoneId: zone.zone_id },
              })
            }
          >
            <MarkerContent>
              <span className="relative block cursor-pointer">
                <ZoneDot
                  percentile={zone.soil_wetness_percentile}
                  className={cn(
                    zone.zone_id === selectedZoneId && "ring-2 ring-foreground"
                  )}
                />
                <span className="absolute top-1/2 left-6 -translate-y-1/2 rounded-4xl bg-background/75 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-foreground backdrop-blur-lg">
                  {zone.name}
                </span>
              </span>
            </MarkerContent>
          </MapMarker>
        ))}
        <FitZones zones={zones} />
        <MapControls position="bottom-right" showZoom />
      </BaseMap>
    </div>
  )
}
