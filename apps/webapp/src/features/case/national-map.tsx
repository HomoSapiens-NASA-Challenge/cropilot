import type { ZoneCard } from "@cropilot/api"
import { useNavigate } from "@tanstack/react-router"
import { cn } from "cn"
import { useEffect, useRef, useState } from "react"
import {
  Map as BaseMap,
  MapControls,
  MapMarker,
  MarkerContent,
  useMap,
} from "@/components/ui/map"
import { placeZoneLabels } from "@/features/case/zone-label-layout"
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

/** Measure actual label sizes so translated names and font loading cannot overlap. */
function ZoneMarkers({
  zones,
  selectedZoneId,
}: {
  zones: ReadonlyArray<ZoneCard>
  selectedZoneId?: string
}) {
  const { map, isLoaded } = useMap()
  const navigate = useNavigate()
  const buttons = useRef(new Map<string, HTMLButtonElement>())
  const labels = useRef(new Map<string, HTMLSpanElement>())
  const anchors = useRef(new Map<string, number>())
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null)

  useEffect(() => {
    if (!map || !isLoaded) return
    const container = map.getContainer()
    let frame = 0
    function layout() {
      frame = 0
      const bounds = container.getBoundingClientRect()
      const measured = zones.flatMap((zone) => {
        const button = buttons.current.get(zone.zone_id)
        const label = labels.current.get(zone.zone_id)
        if (!button || !label) return []
        const point = button.getBoundingClientRect()
        return [
          {
            id: zone.zone_id,
            x: point.left + point.width / 2 - bounds.left,
            y: point.top + point.height / 2 - bounds.top,
            width: label.offsetWidth,
            height: label.offsetHeight,
            priority:
              zone.zone_id === activeZoneId
                ? 2
                : zone.zone_id === selectedZoneId
                  ? 1
                  : 0,
            previousAnchor: anchors.current.get(zone.zone_id),
          },
        ]
      })
      const controls = [
        ...container.querySelectorAll(
          ".maplibregl-control-container > div > *, [data-slot='map-controls']"
        ),
      ].map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          x: rect.left - bounds.left,
          y: rect.top - bounds.top,
          width: rect.width,
          height: rect.height,
        }
      })
      const placements = placeZoneLabels(measured, bounds, controls)
      for (const zone of measured) {
        const label = labels.current.get(zone.id)
        if (!label) continue
        const placement = placements.get(zone.id)
        label.style.visibility = placement ? "visible" : "hidden"
        if (placement) {
          label.style.left = `${placement.x + 10}px`
          label.style.top = `${placement.y + 10}px`
          anchors.current.set(zone.id, placement.anchor)
        }
      }
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(layout)
    }
    const observer = new ResizeObserver(schedule)
    observer.observe(container)
    for (const label of labels.current.values()) observer.observe(label)
    map.on("move", schedule)
    schedule()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      map.off("move", schedule)
    }
  }, [map, isLoaded, zones, selectedZoneId, activeZoneId])

  return zones.map((zone) => (
    <MapMarker
      key={zone.zone_id}
      longitude={zone.longitude_deg}
      latitude={zone.latitude_deg}
    >
      <MarkerContent>
        <button
          ref={(element) => {
            if (element) buttons.current.set(zone.zone_id, element)
            else buttons.current.delete(zone.zone_id)
          }}
          type="button"
          aria-label={zone.name}
          title={zone.name}
          data-zone-marker={zone.zone_id}
          className="relative block size-5 cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-ring"
          onMouseEnter={() => setActiveZoneId(zone.zone_id)}
          onMouseLeave={() => setActiveZoneId(null)}
          onFocus={() => setActiveZoneId(zone.zone_id)}
          onBlur={() => setActiveZoneId(null)}
          onClick={() =>
            navigate({
              to: "/case/$zoneId",
              params: { zoneId: zone.zone_id },
              resetScroll: false,
            })
          }
        >
          <ZoneDot
            percentile={zone.soil_wetness_percentile}
            className={cn(
              zone.zone_id === selectedZoneId && "ring-2 ring-foreground"
            )}
          />
          <span
            ref={(element) => {
              if (element) labels.current.set(zone.zone_id, element)
              else labels.current.delete(zone.zone_id)
            }}
            aria-hidden
            data-zone-label={zone.zone_id}
            className="invisible absolute rounded-lg border border-background bg-background/95 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-foreground"
          >
            {zone.name}
          </span>
        </button>
      </MarkerContent>
    </MapMarker>
  ))
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
  return (
    <div
      className={cn(
        "relative h-88 overflow-hidden rounded-xl border bg-secondary md:h-112",
        className
      )}
    >
      <BaseMap theme="light" center={[-62, -33]} zoom={4}>
        <ZoneMarkers zones={zones} selectedZoneId={selectedZoneId} />
        <FitZones zones={zones} />
        <MapControls position="bottom-right" showZoom />
      </BaseMap>
    </div>
  )
}
