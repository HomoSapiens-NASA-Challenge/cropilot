import type { CampaignPoint, CurrentCampaign } from "@cropilot/api"
import { useRouter } from "expo-router"
import { Fragment, useState } from "react"
import { Pressable, View } from "react-native"
import Svg, { Circle, Line, Path, Rect } from "react-native-svg"
import { Text } from "@/components/ui/text"
import { formatSigned } from "@/features/case/case-format"
import { campaignHref } from "@/features/case/routes"
import { SVG_COLORS } from "@/lib/theme"

export type YieldCrop = "maize" | "soybean"
export const YIELD_CROP_LABEL = { maize: "Maize", soybean: "Soybean" } as const
export function yieldOf(point: CampaignPoint, crop: YieldCrop) {
  return crop === "maize"
    ? {
        anomalyPct: point.maize_yield_anomaly_pct,
        provenance: point.maize_yield_provenance,
      }
    : {
        anomalyPct: point.soybean_yield_anomaly_pct,
        provenance: point.soybean_yield_provenance,
      }
}

const LEFT = 44
const TOP = 30
const BOTTOM = 240
const HEIGHT = 290

/** Round multiples of `step` inside [min, max], so a label always sits on its own value. */
function roundTicks(min: number, max: number, step: number): number[] {
  const values: number[] = []
  const first = Math.ceil(min / step - 1e-9)
  const last = Math.floor(max / step + 1e-9)
  for (let index = first; index <= last; index += 1) {
    values.push(Number((index * step).toFixed(2)))
  }
  return values
}

export function YearsScatter({
  zoneId,
  campaigns,
  current,
  crop,
  limit,
}: {
  zoneId: string
  campaigns: ReadonlyArray<CampaignPoint>
  current: CurrentCampaign
  crop: YieldCrop
  limit: number
}) {
  const [width, setWidth] = useState(0)
  const router = useRouter()
  const plotted = campaigns.filter(
    (point) => point.soil_wetness_end_aug !== null
  )
  const right = Math.max(LEFT + 1, width - 20)
  const xMin =
    Math.floor(
      Math.min(current.oni_jas, ...campaigns.map((p) => p.oni_jas)) * 2
    ) / 2
  const xMax =
    Math.ceil(
      Math.max(current.oni_jas, ...campaigns.map((p) => p.oni_jas)) * 2
    ) / 2
  const wetness = plotted.flatMap((p) =>
    p.soil_wetness_end_aug === null ? [] : [p.soil_wetness_end_aug]
  )
  const yMin =
    Math.floor(Math.min(current.soil_wetness_end_aug, ...wetness) * 20) / 20
  const yMax = Math.min(
    1,
    Math.ceil(Math.max(current.soil_wetness_end_aug, ...wetness) * 20) / 20
  )
  const x = (value: number) =>
    LEFT + ((value - xMin) / (xMax - xMin || 1)) * (right - LEFT)
  const y = (value: number) =>
    BOTTOM - ((value - yMin) / (yMax - yMin || 1)) * (BOTTOM - TOP)
  const yTicks = roundTicks(yMin, yMax, 0.1)
  const xTicks = roundTicks(xMin, xMax, 0.5)
  return (
    <View className="gap-3">
      <Text className="text-xs text-foreground">
        Soil wetness, end of August (NASA POWER, 0 to 1)
      </Text>
      <View
        className="relative"
        style={{ height: HEIGHT }}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        {width > 0 && (
          <>
            <Svg width={width} height={HEIGHT}>
              {current.outside_historical_range && (
                <Rect
                  x={x(current.highest_past_oni_jas)}
                  y={TOP}
                  width={Math.max(0, right - x(current.highest_past_oni_jas))}
                  height={BOTTOM - TOP}
                  fill={SVG_COLORS.accent}
                />
              )}
              {yTicks.map((value) => (
                <Line
                  key={value}
                  x1={LEFT}
                  x2={right}
                  y1={y(value)}
                  y2={y(value)}
                  stroke={SVG_COLORS.border}
                />
              ))}
              {plotted.map((point) => {
                if (point.soil_wetness_end_aug === null) return null
                const cx = x(point.oni_jas)
                const cy = y(point.soil_wetness_end_aug)
                const result = yieldOf(point, crop)
                const color =
                  result.anomalyPct === null
                    ? SVG_COLORS.mutedForeground
                    : result.anomalyPct < 0
                      ? SVG_COLORS.foreground
                      : SVG_COLORS.primary
                const opacity =
                  result.anomalyPct === null
                    ? 1
                    : 0.35 +
                      0.65 * Math.min(Math.abs(result.anomalyPct) / limit, 1)
                return (
                  <Fragment key={point.campaign}>
                    {point.notes.length > 0 && (
                      <>
                        <Line
                          x1={cx}
                          x2={cx}
                          y1={cy - 6}
                          y2={cy - 15}
                          stroke={SVG_COLORS.foreground}
                        />
                        <Circle
                          cx={cx}
                          cy={cy - 17}
                          r={2}
                          fill={SVG_COLORS.foreground}
                        />
                      </>
                    )}
                    {point.is_analog && (
                      <Circle
                        cx={cx}
                        cy={cy}
                        r={9}
                        fill="none"
                        stroke={SVG_COLORS.foreground}
                        strokeWidth={1.5}
                      />
                    )}
                    <Circle
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill={
                        result.anomalyPct === null ||
                        result.provenance === "modeled"
                          ? SVG_COLORS.background
                          : color
                      }
                      fillOpacity={opacity}
                      stroke={color}
                      strokeWidth={
                        result.anomalyPct === null ||
                        result.provenance === "modeled"
                          ? 2
                          : 1
                      }
                      strokeDasharray={
                        result.anomalyPct === null ? "2 2" : undefined
                      }
                    />
                  </Fragment>
                )
              })}
              <Path
                d={`M ${x(current.oni_jas)} ${y(current.soil_wetness_end_aug) - 8} l 8 8 l -8 8 l -8 -8 Z`}
                fill={SVG_COLORS.primary}
                stroke={SVG_COLORS.background}
                strokeWidth={2}
              />
            </Svg>
            {yTicks.map((value) => (
              <Text
                key={`y-${value}`}
                className="absolute text-xs text-muted-foreground"
                style={{ left: 0, top: y(value) - 8 }}
              >
                {value.toFixed(1)}
              </Text>
            ))}
            {xTicks.map((value) => (
              <Text
                key={`x-${value}`}
                className="absolute text-xs text-muted-foreground"
                style={{ left: x(value) - 15, top: BOTTOM + 5 }}
              >
                {formatSigned(value, 1)}
              </Text>
            ))}
            <Text
              className="absolute text-xs text-foreground"
              style={{
                left: Math.max(LEFT, x(current.oni_jas) - 90),
                top: Math.max(0, y(current.soil_wetness_end_aug) - 30),
              }}
            >
              {current.campaign} now
            </Text>
            {plotted
              .filter(
                (point) =>
                  point.notes.length > 0 && point.soil_wetness_end_aug !== null
              )
              .map((point) => (
                <Text
                  key={`label-${point.campaign}`}
                  pointerEvents="none"
                  className="absolute text-xs text-foreground"
                  style={{
                    left: Math.max(
                      LEFT,
                      Math.min(right - 55, x(point.oni_jas) + 8)
                    ),
                    top: Math.max(
                      0,
                      y(point.soil_wetness_end_aug ?? yMin) - 30
                    ),
                  }}
                >
                  {point.campaign}
                </Text>
              ))}
            {plotted.map((point) =>
              point.soil_wetness_end_aug === null ? null : (
                <Pressable
                  key={point.campaign}
                  accessibilityRole="button"
                  accessibilityLabel={`${point.campaign}, ONI ${formatSigned(point.oni_jas)}`}
                  onPress={() =>
                    router.push(campaignHref(zoneId, point.campaign))
                  }
                  style={{
                    position: "absolute",
                    left: x(point.oni_jas) - 22,
                    top: y(point.soil_wetness_end_aug) - 22,
                    width: 44,
                    height: 44,
                  }}
                />
              )
            )}
          </>
        )}
      </View>
      <Text className="text-center text-xs text-foreground">
        ONI, July to September (NOAA)
      </Text>
    </View>
  )
}
