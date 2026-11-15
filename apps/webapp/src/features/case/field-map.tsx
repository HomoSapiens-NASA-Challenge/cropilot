import type { FieldBlock, Lot } from "@cropilot/api"
import { cn } from "cn"
import type { Feature, FeatureCollection, Polygon } from "geojson"
import { Crosshair } from "lucide-react"
import { useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Map as BaseMap,
  MapControls,
  MapGeoJSON,
  MapMarker,
  MarkerContent,
  useMap,
} from "@/components/ui/map"
import { hasLotData } from "@/features/case/field-panels"
import { cropColor, LOT_STATUS, MAP_ACCENT_COLOR } from "@/lib/data-colors"
import { type LngLat, pointsBounds, ringCenter } from "@/lib/geo"
import { useI18n } from "@/lib/i18n"
import { powerCellAt } from "@/lib/nasa-power-grid"

const NO_STATUS = { color: "#94a3b8", width: 1 } as const
const LOT_OUTLINE_PADDING_PX = 40

type LotFeatureProperties = {
  fieldId: string
  fillColor: string
  fillOpacity: number
  outlineColor: string
  outlineWidth: number
}

function lotFeature(lot: Lot): Feature<Polygon, LotFeatureProperties> {
  const status = lot.status ? LOT_STATUS[lot.status] : NO_STATUS
  return {
    type: "Feature",
    properties: {
      fieldId: lot.field_id,
      fillColor: cropColor(lot.latest_crop),
      // An outline with no crop and no status is context: it stays faint.
      fillOpacity: hasLotData(lot) ? 0.68 : 0.12,
      outlineColor: status.color,
      outlineWidth: status.width,
    },
    geometry: { type: "Polygon", coordinates: lot.polygon },
  }
}

function polygonFeature(polygon: number[][][]): Feature<Polygon> {
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: polygon },
  }
}

function CameraController({ bounds }: { bounds: [LngLat, LngLat] }) {
  const { map, isLoaded } = useMap()

  useEffect(() => {
    if (!map || !isLoaded) return
    map.fitBounds(bounds, {
      padding: LOT_OUTLINE_PADDING_PX,
      duration: 700,
      maxZoom: 15,
    })
  }, [map, isLoaded, bounds])

  return null
}

/**
 * The lots of the zone on the map: fill is the latest crop, outline is the status of the
 * lot. The reference footprint is outlined in the accent and named. The dashed rectangle
 * is the NASA POWER cell, which is the scale of the climate data.
 */
export function FieldMap({
  field,
  selectedLotId,
  isCellView,
  onSelectLot,
  onToggleCellView,
}: {
  field: FieldBlock
  selectedLotId: string | null
  isCellView: boolean
  onSelectLot: (fieldId: string | null) => void
  onToggleCellView: () => void
}) {
  const { t } = useI18n("case")

  const lotsData = useMemo<FeatureCollection<Polygon, LotFeatureProperties>>(
    () => ({ type: "FeatureCollection", features: field.lots.map(lotFeature) }),
    [field.lots]
  )
  const selectedLot = field.lots.find((lot) => lot.field_id === selectedLotId)
  const reference = field.reference_field

  const allPoints = useMemo(
    () => [
      ...field.lots.flatMap((lot) => lot.polygon.flat()),
      ...(reference ? reference.polygon.flat() : []),
    ],
    [field.lots, reference]
  )
  const lotsBounds = useMemo(() => pointsBounds(allPoints), [allPoints])
  const cell = useMemo(() => powerCellAt(ringCenter(allPoints)), [allPoints])
  const cellBounds = useMemo<[LngLat, LngLat]>(
    () => [
      [cell.west, cell.south],
      [cell.east, cell.north],
    ],
    [cell]
  )
  const cellOutline: Feature<Polygon> = useMemo(
    () =>
      polygonFeature([
        [
          [cell.west, cell.south],
          [cell.east, cell.south],
          [cell.east, cell.north],
          [cell.west, cell.north],
          [cell.west, cell.south],
        ],
      ]),
    [cell]
  )
  const referenceLabelPoint = reference
    ? ringCenter(reference.polygon[0])
    : null
  const referenceOutline = useMemo(
    () => (reference ? polygonFeature(reference.polygon) : null),
    [reference]
  )
  const selectedOutline = useMemo(
    () => (selectedLot ? polygonFeature(selectedLot.polygon) : null),
    [selectedLot]
  )

  return (
    <div className="relative isolate h-104 overflow-hidden rounded-xl border bg-secondary md:h-136">
      {/* Cooperative gestures: the page scrolls over the map; Ctrl/⌘ + scroll or two fingers zoom it. */}
      <BaseMap
        theme="light"
        center={ringCenter(allPoints)}
        zoom={11}
        cooperativeGestures
      >
        <MapGeoJSON
          id="power-cell"
          data={cellOutline}
          fillPaint={false}
          linePaint={{
            "line-color": MAP_ACCENT_COLOR,
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          }}
        />
        <MapGeoJSON<LotFeatureProperties>
          id="case-lots"
          data={lotsData}
          promoteId="fieldId"
          interactive
          fillPaint={{
            "fill-color": ["get", "fillColor"],
            "fill-opacity": ["get", "fillOpacity"],
          }}
          fillHoverPaint={{ "fill-opacity": 0.92 }}
          linePaint={{
            "line-color": ["get", "outlineColor"],
            "line-width": ["get", "outlineWidth"],
          }}
          onClick={(event) => onSelectLot(event.feature.properties.fieldId)}
        />
        {selectedOutline && (
          <MapGeoJSON
            id="case-selected-lot"
            data={selectedOutline}
            fillPaint={false}
            linePaint={{ "line-color": MAP_ACCENT_COLOR, "line-width": 3.5 }}
          />
        )}
        {referenceOutline && (
          <MapGeoJSON
            id="case-reference"
            data={referenceOutline}
            fillPaint={{ "fill-color": MAP_ACCENT_COLOR, "fill-opacity": 0.12 }}
            linePaint={{
              "line-color": MAP_ACCENT_COLOR,
              "line-width": 3,
              "line-dasharray": [1.5, 1],
            }}
          />
        )}
        {reference && referenceLabelPoint && (
          <MapMarker
            longitude={referenceLabelPoint[0]}
            latitude={referenceLabelPoint[1]}
            anchor="left"
            offset={[10, 0]}
            onClick={() => onSelectLot(null)}
          >
            <MarkerContent>
              <span className="block rounded-4xl bg-primary px-2.5 py-1 text-xs font-medium whitespace-nowrap text-primary-foreground shadow-sm">
                {t("Footprint {value1}", { value1: reference.field_id })}
              </span>
            </MarkerContent>
          </MapMarker>
        )}
        <CameraController bounds={isCellView ? cellBounds : lotsBounds} />
        <MapControls position="bottom-right" showZoom showFullscreen />
      </BaseMap>

      <div className="absolute top-3 left-3 z-10">
        <Button
          variant="outline"
          size="sm"
          aria-pressed={isCellView}
          onClick={onToggleCellView}
          className={cn(
            "bg-background/75 shadow-sm backdrop-blur-lg",
            isCellView && "border-primary text-primary"
          )}
        >
          <Crosshair data-icon="inline-start" />
          {isCellView ? t("Back to the lots") : t("Show the NASA POWER cell")}
        </Button>
      </div>
    </div>
  )
}
