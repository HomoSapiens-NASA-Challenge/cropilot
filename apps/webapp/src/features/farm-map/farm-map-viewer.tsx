import type { Region } from "@cropilot/api"
import type { Feature, Polygon } from "geojson"
import { ArrowLeft } from "lucide-react"
import type {
  FillLayerSpecification,
  LineLayerSpecification,
} from "maplibre-gl"
import { useEffect, useMemo, useState } from "react"
import { RegionDialog } from "@/components/region-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Map as BaseMap,
  MapControls,
  MapGeoJSON,
  MapMarker,
  MarkerContent,
  useMap,
} from "@/components/ui/map"
import { CropLegend } from "@/features/farm-map/crop-swatch"
import { CROP_FILL_COLOR } from "@/features/farm-map/crops"
import { FarmDetails } from "@/features/farm-map/farm-details"
import { FarmList } from "@/features/farm-map/farm-list"
import { formatHectares, formatLngLat } from "@/features/farm-map/format"
import type { LngLat } from "@/features/farm-map/geometry"
import { LotHoverCard } from "@/features/farm-map/lot-hover-card"
import { powerCellAt } from "@/features/farm-map/nasa-power-grid"
import {
  type LotFeatureProperties,
  SYNTHETIC_DEMO_BOUNDS,
  SYNTHETIC_DEMO_FARMS,
  SYNTHETIC_DEMO_FARMS_GEOJSON,
  SYNTHETIC_DEMO_LOTS_BY_ID,
  SYNTHETIC_DEMO_LOTS_GEOJSON,
  SYNTHETIC_DEMO_REGION_ID,
} from "@/features/farm-map/synthetic-demo-farms"

// Literal colors for MapLibre paint: the theme's --foreground and --primary.
const FARM_OUTLINE_COLOR = "#0d1d32"
const SELECTED_FARM_OUTLINE_COLOR = "#314ec7"
const LOT_OUTLINE_COLOR = "#ffffff"

const INITIAL_CENTER: LngLat = [-60.58, -33.9]
// Leaves room for the floating side panel (w-80 plus its margin).
const WIDE_CAMERA_PADDING = { top: 64, bottom: 64, right: 64, left: 380 }
const NARROW_CAMERA_PADDING = 32
const WIDE_LAYOUT_MIN_PX = 768

function CameraController({ bounds }: { bounds: [LngLat, LngLat] }) {
  const { map, isLoaded } = useMap()

  useEffect(() => {
    if (!map || !isLoaded) return
    const isWide = map.getContainer().clientWidth >= WIDE_LAYOUT_MIN_PX
    map.fitBounds(bounds, {
      padding: isWide ? WIDE_CAMERA_PADDING : NARROW_CAMERA_PADDING,
      duration: 900,
      maxZoom: 15,
    })
  }, [map, isLoaded, bounds])

  return null
}

/** The farm map of the workspace region. Only the synthetic demo region has farms today. */
export function FarmMapViewer({ region }: { region: Region }) {
  return region.id === SYNTHETIC_DEMO_REGION_ID ? (
    <DemoFarmsMap />
  ) : (
    <RegionWithoutFarmsMap region={region} />
  )
}

function RegionWithoutFarmsMap({ region }: { region: Region }) {
  const referencePoint: LngLat = [region.longitude_deg, region.latitude_deg]
  const cell = powerCellAt(referencePoint)
  const [isRegionDialogOpen, setRegionDialogOpen] = useState(false)
  const cellBounds = useMemo<[LngLat, LngLat]>(
    () => [
      [cell.west, cell.south],
      [cell.east, cell.north],
    ],
    [cell.west, cell.south, cell.east, cell.north]
  )
  const cellOutline: Feature<Polygon> = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [cell.west, cell.south],
          [cell.east, cell.south],
          [cell.east, cell.north],
          [cell.west, cell.north],
          [cell.west, cell.south],
        ],
      ],
    },
  }

  return (
    <Card className="relative h-[calc(100svh-15rem)] min-h-128 gap-0 overflow-hidden p-0">
      <BaseMap theme="light" center={referencePoint} zoom={8}>
        <MapGeoJSON
          id="region-power-cell"
          data={cellOutline}
          fillPaint={{
            "fill-color": SELECTED_FARM_OUTLINE_COLOR,
            "fill-opacity": 0.06,
          }}
          linePaint={{
            "line-color": SELECTED_FARM_OUTLINE_COLOR,
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          }}
        />
        <MapMarker longitude={referencePoint[0]} latitude={referencePoint[1]}>
          <MarkerContent />
        </MapMarker>
        <CameraController bounds={cellBounds} />
        <MapControls position="bottom-right" showCompass showFullscreen />
      </BaseMap>

      <Card className="absolute top-3 left-3 z-10 hidden w-80 gap-0 bg-background/75 py-0 shadow-xl backdrop-blur-lg md:flex">
        <CardHeader className="border-b py-4">
          <CardTitle>{region.name}</CardTitle>
          <CardDescription className="text-xs">
            {region.department} department, {region.province}
          </CardDescription>
        </CardHeader>
        <div className="flex flex-col gap-4 p-4 text-sm leading-relaxed">
          <div className="flex flex-col gap-1">
            <p className="font-medium">No farms in this region yet</p>
            <p className="text-muted-foreground">
              The demo farms are synthetic and sit around Pergamino. Switch your
              region to Pergamino to explore them.
            </p>
          </div>
          <p className="text-muted-foreground">
            The dot is the region's reference point,{" "}
            <span className="tabular-nums">{formatLngLat(referencePoint)}</span>
            . The dashed outline is the NASA POWER cell that holds it, about{" "}
            {cell.heightKm.toFixed(0)} × {cell.widthKm.toFixed(0)} km. POWER
            gives one value for the whole cell.
          </p>
          <Button variant="outline" onClick={() => setRegionDialogOpen(true)}>
            Change region
          </Button>
        </div>
      </Card>
      <RegionDialog
        currentRegion={region}
        open={isRegionDialogOpen}
        onOpenChange={setRegionDialogOpen}
      />
    </Card>
  )
}

function DemoFarmsMap() {
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null)
  const [hoveredFarmId, setHoveredFarmId] = useState<string | null>(null)
  const [mapHoveredLotId, setMapHoveredLotId] = useState<string | null>(null)
  const [tableHoveredLotId, setTableHoveredLotId] = useState<string | null>(
    null
  )

  const selectedFarm =
    SYNTHETIC_DEMO_FARMS.find((farm) => farm.farmId === selectedFarmId) ?? null
  const mapHoveredLot = mapHoveredLotId
    ? (SYNTHETIC_DEMO_LOTS_BY_ID.get(mapHoveredLotId) ?? null)
    : null
  const focusedFarmId = hoveredFarmId ?? mapHoveredLot?.farmId ?? null

  const farmsInSameCell = useMemo(() => {
    if (!selectedFarm) return []
    const cellId = powerCellAt(selectedFarm.center).cellId
    return SYNTHETIC_DEMO_FARMS.filter(
      (farm) =>
        farm.farmId !== selectedFarm.farmId &&
        powerCellAt(farm.center).cellId === cellId
    )
  }, [selectedFarm])

  const selectFarm = (farmId: string | null) => {
    setSelectedFarmId(farmId)
    setHoveredFarmId(null)
    setTableHoveredLotId(null)
  }

  const lotFillPaint = useMemo<FillLayerSpecification["paint"]>(
    () => ({
      "fill-color": CROP_FILL_COLOR,
      "fill-opacity": [
        "case",
        ["==", ["get", "lotId"], tableHoveredLotId ?? ""],
        0.92,
        ["==", ["get", "farmId"], focusedFarmId ?? ""],
        0.72,
        ["==", ["get", "farmId"], selectedFarmId ?? ""],
        0.62,
        selectedFarmId === null ? 0.5 : 0.18,
      ],
    }),
    [tableHoveredLotId, focusedFarmId, selectedFarmId]
  )

  const farmLinePaint = useMemo<LineLayerSpecification["paint"]>(
    () => ({
      "line-color": [
        "case",
        ["==", ["get", "farmId"], selectedFarmId ?? ""],
        SELECTED_FARM_OUTLINE_COLOR,
        FARM_OUTLINE_COLOR,
      ],
      "line-width": [
        "case",
        ["==", ["get", "farmId"], selectedFarmId ?? ""],
        3,
        ["==", ["get", "farmId"], focusedFarmId ?? ""],
        2.5,
        1.25,
      ],
    }),
    [selectedFarmId, focusedFarmId]
  )

  return (
    <Card className="relative h-[calc(100svh-15rem)] min-h-128 gap-0 overflow-hidden p-0">
      <BaseMap theme="light" center={INITIAL_CENTER} zoom={9}>
        <MapGeoJSON<LotFeatureProperties>
          id="demo-lots"
          data={SYNTHETIC_DEMO_LOTS_GEOJSON}
          promoteId="lotId"
          interactive
          fillPaint={lotFillPaint}
          fillHoverPaint={{ "fill-opacity": 0.92 }}
          linePaint={{ "line-color": LOT_OUTLINE_COLOR, "line-width": 1 }}
          onHover={(event) =>
            setMapHoveredLotId(event?.feature.properties.lotId ?? null)
          }
          onClick={(event) => selectFarm(event.feature.properties.farmId)}
        />
        <MapGeoJSON
          id="demo-farms"
          data={SYNTHETIC_DEMO_FARMS_GEOJSON}
          fillPaint={false}
          linePaint={farmLinePaint}
        />
        {SYNTHETIC_DEMO_FARMS.filter(
          (farm) => farm.farmId !== selectedFarmId
        ).map((farm) => (
          <MapMarker
            key={farm.farmId}
            longitude={farm.center[0]}
            latitude={farm.center[1]}
            onClick={() => selectFarm(farm.farmId)}
            onMouseEnter={() => setHoveredFarmId(farm.farmId)}
            onMouseLeave={() => setHoveredFarmId(null)}
          >
            <MarkerContent>
              <span
                data-focused={farm.farmId === focusedFarmId}
                className="block rounded-full bg-background px-2.5 py-1 text-xs font-medium whitespace-nowrap text-foreground shadow-sm ring-1 ring-foreground/10 transition-all data-[focused=true]:scale-105 data-[focused=true]:bg-primary data-[focused=true]:text-primary-foreground"
              >
                {farm.name}
              </span>
            </MarkerContent>
          </MapMarker>
        ))}
        <LotHoverCard
          lot={mapHoveredLot}
          farmName={
            SYNTHETIC_DEMO_FARMS.find(
              (farm) => farm.farmId === mapHoveredLot?.farmId
            )?.name
          }
        />
        <CameraController
          bounds={selectedFarm?.bounds ?? SYNTHETIC_DEMO_BOUNDS}
        />
        <MapControls position="bottom-right" showCompass showFullscreen />
      </BaseMap>

      <Card className="absolute top-3 bottom-3 left-3 z-10 hidden w-80 gap-0 bg-background/75 py-0 shadow-xl backdrop-blur-lg md:flex">
        {selectedFarm ? (
          <>
            <CardHeader className="border-b py-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Back to all farms"
                  onClick={() => selectFarm(null)}
                >
                  <ArrowLeft />
                </Button>
                <div className="flex flex-col gap-0.5">
                  <CardTitle>{selectedFarm.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {formatHectares(selectedFarm.areaHa)} ·{" "}
                    {selectedFarm.lots.length} lots
                  </CardDescription>
                </div>
              </div>
              <CardAction>
                <Badge variant="outline">Synthetic</Badge>
              </CardAction>
            </CardHeader>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <FarmDetails
                key={selectedFarm.farmId}
                farm={selectedFarm}
                farmsInSameCell={farmsInSameCell}
                activeLotId={tableHoveredLotId ?? mapHoveredLotId}
                onHoverLot={setTableHoveredLotId}
              />
            </div>
          </>
        ) : (
          <>
            <CardHeader className="border-b py-4">
              <CardTitle>Demo farms</CardTitle>
              <CardDescription className="text-xs">
                Around Pergamino, Buenos Aires
              </CardDescription>
              <CardAction>
                <Badge variant="outline">Synthetic</Badge>
              </CardAction>
            </CardHeader>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <FarmList
                farms={SYNTHETIC_DEMO_FARMS}
                hoveredFarmId={focusedFarmId}
                onHoverFarm={setHoveredFarmId}
                onSelectFarm={selectFarm}
              />
            </div>
            <p className="border-t px-4 py-3 text-xs leading-relaxed text-muted-foreground">
              Boundaries, names and crops are synthetic. Areas are computed from
              the drawn boundaries.
            </p>
          </>
        )}
      </Card>

      <div className="absolute top-3 right-3 z-10">
        <CropLegend />
      </div>
    </Card>
  )
}
