import { useState } from "react"
import { type GestureResponderEvent, Pressable, View } from "react-native"
import Svg, { Polygon, Text as SvgText } from "react-native-svg"
import { CROPS, type Crop } from "@/features/farm-map/crops"
import { type LngLat, ringCenter } from "@/features/farm-map/geometry"
import type { DemoFarm } from "@/features/farm-map/synthetic-demo-farms"
import { SVG_COLORS } from "@/lib/theme"

const LABELS: Record<Crop, string> = {
  soybean: "Soy",
  maize: "Maize",
  wheatSoybean: "W/S",
}

/** Width of the drawing's coordinate system; the SVG scales it to the box. */
const VIEW_WIDTH = 320

type Point = [number, number]

function numberField(source: object, key: string): number | undefined {
  const value: unknown = Reflect.get(source, key)
  return typeof value === "number" ? value : undefined
}

/**
 * Where the press landed inside the pressed box. Native sends locationX/Y;
 * on web the press is a DOM click, which carries offsetX/Y instead.
 */
function localPoint(event: GestureResponderEvent): Point {
  const native: object = event.nativeEvent
  return [
    numberField(native, "locationX") ?? numberField(native, "offsetX") ?? NaN,
    numberField(native, "locationY") ?? numberField(native, "offsetY") ?? NaN,
  ]
}

/** Ray casting: whether a point falls inside a polygon. */
function isInside([x, y]: Point, polygon: ReadonlyArray<Point>): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]
    const b = polygon[j]
    if (a === undefined || b === undefined) {
      continue
    }
    const crosses =
      a[1] > y !== b[1] > y &&
      x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
    if (crosses) {
      inside = !inside
    }
  }
  return inside
}

export function FarmSchematic({
  farm,
  height,
  selectedLotId,
  onSelectLot,
}: {
  farm: DemoFarm
  height: number
  selectedLotId?: string | null
  onSelectLot?: (lotId: string) => void
}) {
  const [boxWidth, setBoxWidth] = useState(0)
  const cosine = Math.cos((farm.center[1] * Math.PI) / 180)
  const project = ([lon, lat]: LngLat): Point => [lon * cosine, -lat]
  const points = farm.ring.map(project)
  const xs = points.map((point) => point[0])
  const ys = points.map((point) => point[1])
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const width = Math.max(...xs) - minX
  const projectedHeight = Math.max(...ys) - minY
  const scale = Math.min(
    (VIEW_WIDTH - 16) / width,
    (height - 16) / projectedHeight
  )
  const toPoint = (point: LngLat): Point => {
    const [x, y] = project(point)
    return [
      8 + (VIEW_WIDTH - 16 - width * scale) / 2 + (x - minX) * scale,
      8 + (height - 16 - projectedHeight * scale) / 2 + (y - minY) * scale,
    ]
  }
  const toPoints = (ring: LngLat[]) =>
    ring.map((point) => toPoint(point).join(",")).join(" ")

  // Taps land on the box, not on the SVG shapes: react-native-svg's touch
  // props on shapes leak to the DOM on web. The tap is mapped back into the
  // drawing's coordinates (`xMidYMid meet`) and matched against each lot.
  const selectAt = (event: GestureResponderEvent) => {
    if (!onSelectLot || boxWidth === 0) {
      return
    }
    const fit = Math.min(boxWidth / VIEW_WIDTH, 1)
    const offsetX = (boxWidth - VIEW_WIDTH * fit) / 2
    const offsetY = (height - height * fit) / 2
    const [localX, localY] = localPoint(event)
    const tap: Point = [(localX - offsetX) / fit, (localY - offsetY) / fit]
    const lot = farm.lots.find((item) => isInside(tap, item.ring.map(toPoint)))
    if (lot) {
      onSelectLot(lot.lotId)
    }
  }

  const drawing = (
    <View pointerEvents="none">
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        accessibilityLabel={`Schematic map of ${farm.name}`}
      >
        {farm.lots.map((lot) => (
          <Polygon
            key={lot.lotId}
            points={toPoints(lot.ring)}
            fill={CROPS[lot.crop].fill}
            stroke={SVG_COLORS.card}
            strokeWidth={1}
          />
        ))}
        <Polygon
          points={toPoints(farm.ring)}
          fill="none"
          stroke={SVG_COLORS.foreground}
          strokeWidth={1}
        />
        {farm.lots.map((lot) => {
          const [x, y] = toPoint(ringCenter(lot.ring))
          return (
            <SvgText
              key={lot.lotId}
              x={x}
              y={y}
              textAnchor="middle"
              alignmentBaseline="middle"
              fontSize={10}
              // Dark ink: white on the maize fill reads at about 2:1.
              fill={SVG_COLORS.foreground}
            >
              {LABELS[lot.crop]}
            </SvgText>
          )
        })}
        {farm.lots
          .filter((lot) => lot.lotId === selectedLotId)
          .map((lot) => (
            <Polygon
              key={lot.lotId}
              points={toPoints(lot.ring)}
              fill="none"
              stroke={SVG_COLORS.primary}
              strokeWidth={3}
            />
          ))}
      </Svg>
    </View>
  )

  if (!onSelectLot) {
    return drawing
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Selects the lot under your finger"
      onLayout={(event) => setBoxWidth(event.nativeEvent.layout.width)}
      onPress={selectAt}
    >
      {drawing}
    </Pressable>
  )
}
