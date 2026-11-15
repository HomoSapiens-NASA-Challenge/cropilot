import type { CaseBundle } from "@cropilot/api"
import { useState } from "react"
import { type GestureResponderEvent, Pressable, View } from "react-native"
import Svg, { Polygon } from "react-native-svg"
import { cropColor, LOT_STATUS } from "@/lib/data-colors"
import { SVG_COLORS } from "@/lib/theme"

type Field = NonNullable<CaseBundle["field"]>
type Point = [number, number]
const WIDTH = 320
const HEIGHT = 240

function inside([x, y]: Point, polygon: Point[]) {
  let result = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]
    const b = polygon[j]
    if (
      a &&
      b &&
      a[1] > y !== b[1] > y &&
      x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
    )
      result = !result
  }
  return result
}

function coordinate(value: number[]): Point | null {
  const [lon, lat] = value
  return lon === undefined || lat === undefined ? null : [lon, lat]
}

function ring(polygon: number[][][]): Point[] {
  return (polygon[0] ?? [])
    .map(coordinate)
    .filter((point): point is Point => point !== null)
}

/**
 * The lots as outlines, framed on `framedLots`: the farm's lots or every lot of the zone.
 * All outlines are drawn; the ones outside the frame are cut by the view box.
 */
export function FieldMap({
  field,
  framedLots,
  onSelect,
}: {
  field: Field
  framedLots: Field["lots"]
  onSelect: (id: string) => void
}) {
  const [boxWidth, setBoxWidth] = useState(0)
  const all = (framedLots.length ? framedLots : field.lots).flatMap((lot) =>
    ring(lot.polygon)
  )
  if (all.length === 0) return null
  const latitude = all.reduce((sum, point) => sum + point[1], 0) / all.length
  const cosine = Math.cos((latitude * Math.PI) / 180)
  const projected = all.map(([lon, lat]) => [lon * cosine, -lat])
  const xs = projected.map((point) => point[0] ?? 0)
  const ys = projected.map((point) => point[1] ?? 0)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const width = Math.max(...xs) - minX
  const height = Math.max(...ys) - minY
  const scale = Math.min(
    (WIDTH - 16) / (width || 1),
    (HEIGHT - 16) / (height || 1)
  )
  const project = ([lon, lat]: Point): Point => [
    8 + (WIDTH - 16 - width * scale) / 2 + (lon * cosine - minX) * scale,
    8 + (HEIGHT - 16 - height * scale) / 2 + (-lat - minY) * scale,
  ]
  const points = (polygon: number[][][]) => ring(polygon).map(project)
  const selectAt = (event: GestureResponderEvent) => {
    if (!boxWidth) return
    const native: object = event.nativeEvent
    const get = (key: string) => {
      const value: unknown = Reflect.get(native, key)
      return typeof value === "number" ? value : undefined
    }
    const x = get("locationX") ?? get("offsetX")
    const y = get("locationY") ?? get("offsetY")
    if (x === undefined || y === undefined) return
    const fit = Math.min(boxWidth / WIDTH, 1)
    const tap: Point = [
      (x - (boxWidth - WIDTH * fit) / 2) / fit,
      (y - (HEIGHT - HEIGHT * fit) / 2) / fit,
    ]
    const lot = field.lots.find((item) => inside(tap, points(item.polygon)))
    if (lot) onSelect(lot.field_id)
  }
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        onLayout={(event) => setBoxWidth(event.nativeEvent.layout.width)}
        onPress={selectAt}
      >
        <View pointerEvents="none">
          <Svg
            width="100%"
            height={HEIGHT}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {field.lots.map((lot) => (
              <Polygon
                key={lot.field_id}
                points={points(lot.polygon)
                  .map((point) => point.join(","))
                  .join(" ")}
                fill={cropColor(lot.latest_crop)}
                fillOpacity={lot.latest_crop || lot.status ? 0.68 : 0.12}
                stroke={
                  lot.status
                    ? LOT_STATUS[lot.status].color
                    : SVG_COLORS.otherCrop
                }
                strokeWidth={lot.status ? LOT_STATUS[lot.status].width : 1}
              />
            ))}
            {field.reference_field && (
              <Polygon
                points={points(field.reference_field.polygon)
                  .map((point) => point.join(","))
                  .join(" ")}
                fill="none"
                stroke={SVG_COLORS.primary}
                strokeWidth={2}
                strokeDasharray="4 3"
              />
            )}
          </Svg>
        </View>
      </Pressable>
    </View>
  )
}
