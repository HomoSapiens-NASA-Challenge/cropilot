import { useEffect, useRef, useState } from "react"
import { Animated, Easing, Platform, ScrollView, View } from "react-native"
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg"
import { Text } from "@/components/ui/text"
import { Band } from "@/features/landing/frame"
import { SVG_COLORS } from "@/lib/theme"
import { useReduceMotion } from "@/lib/use-reduce-motion"

// Our own marks, drawn for this strip. No agency logos or insignia: their use
// needs the agency's permission and would read as an endorsement.
const SOURCES = ["NASA POWER", "MERRA-2", "NOAA", "ONI"] as const
const TRACK = [...SOURCES, ...SOURCES]
type Source = (typeof SOURCES)[number]

function SourceMark({ source }: { source: Source }) {
  return (
    <View className="flex-row shrink-0 items-center gap-3">
      <Svg
        width={36}
        height={36}
        viewBox="0 0 32 32"
        fill="none"
        stroke={SVG_COLORS.foreground}
        strokeOpacity={0.75}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {source === "NASA POWER" && (
          <>
            <Circle
              cx="16"
              cy="13"
              r="4"
              fill={SVG_COLORS.primary}
              stroke="none"
            />
            <Path d="M6 13H8.5M8.9 5.9L10.7 7.7M16 3V5.5M23.1 5.9L21.3 7.7M26 13H23.5" />
            <Path d="M4 20H28M8 24H24M12 28H20" />
          </>
        )}
        {source === "MERRA-2" && (
          <>
            <Circle cx="16" cy="16" r="11" />
            <Ellipse cx="16" cy="16" rx="4.5" ry="11" />
            <Path d="M16 5V27M5.75 12H26.25M5.75 20H26.25" />
            <Path
              d="M16 12H20.2A4.5 11 0 0 1 20.2 20H16Z"
              fill={SVG_COLORS.primary}
              stroke="none"
            />
          </>
        )}
        {source === "NOAA" && (
          <>
            <Path d="M5 22A11 11 0 0 1 27 22" />
            <Path d="M8.2 14.2L10.3 16.3M16 11V14M23.8 14.2L21.7 16.3" />
            <Path
              d="M16 22L21 16"
              strokeWidth={2}
              stroke={SVG_COLORS.primary}
              strokeOpacity={1}
            />
            <Circle
              cx="16"
              cy="22"
              r="1.75"
              fill={SVG_COLORS.foreground}
              fillOpacity={0.75}
              stroke="none"
            />
            <Path d="M4 26H28" />
          </>
        )}
        {source === "ONI" && (
          <>
            <Path
              d="M3 16C5.5 5 10 5 12.5 16Z"
              fill={SVG_COLORS.primary}
              fillOpacity={0.25}
              stroke="none"
            />
            <Path d="M3 16H29" opacity={0.4} />
            <Path d="M12.5 16C15 27 19.5 27 22 16C23.75 9 27.25 9 29 16" />
            <Path
              d="M3 16C5.5 5 10 5 12.5 16"
              stroke={SVG_COLORS.primary}
              strokeOpacity={1}
            />
          </>
        )}
      </Svg>
      {source === "NASA POWER" && (
        <Text className="text-sm font-medium tracking-widest text-foreground/75 uppercase">
          NASA POWER
        </Text>
      )}
      {source === "MERRA-2" && (
        <Text className="text-2xl font-light tracking-tight text-foreground/75">
          MERRA-2
        </Text>
      )}
      {source === "NOAA" && (
        <View>
          <Text className="text-lg font-medium leading-none tracking-tight text-foreground/75">
            NOAA
          </Text>
          <Text className="mt-1 text-xs leading-none text-muted-foreground">
            Climate Prediction Center
          </Text>
        </View>
      )}
      {source === "ONI" && (
        <View>
          <Text className="text-2xl font-light leading-none tracking-tight text-foreground/75">
            ONI
          </Text>
          <Text className="mt-1 text-xs leading-none text-muted-foreground">
            Oceanic Niño Index
          </Text>
        </View>
      )}
    </View>
  )
}

function EdgeFade() {
  return (
    <View
      pointerEvents="none"
      className="absolute inset-0 flex-row justify-between"
    >
      <Svg width="15%" height="100%">
        <Defs>
          <LinearGradient
            id="source-strip-left-fade"
            x1="0"
            y1="0"
            x2="1"
            y2="0"
          >
            <Stop offset="0" stopColor={SVG_COLORS.background} />
            <Stop
              offset="1"
              stopColor={SVG_COLORS.background}
              stopOpacity={0}
            />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#source-strip-left-fade)" />
      </Svg>
      <Svg width="15%" height="100%">
        <Defs>
          <LinearGradient
            id="source-strip-right-fade"
            x1="0"
            y1="0"
            x2="1"
            y2="0"
          >
            <Stop
              offset="0"
              stopColor={SVG_COLORS.background}
              stopOpacity={0}
            />
            <Stop offset="1" stopColor={SVG_COLORS.background} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#source-strip-right-fade)" />
      </Svg>
    </View>
  )
}

export function SourceStrip() {
  const reduceMotion = useReduceMotion()
  const offset = useRef(new Animated.Value(0)).current
  const [contentWidth, setContentWidth] = useState(0)

  useEffect(() => {
    offset.setValue(0)
    if (reduceMotion || contentWidth <= 0) return
    const animation = Animated.loop(
      Animated.timing(offset, {
        toValue: -contentWidth / 2,
        duration: 40000,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
      })
    )
    animation.start()
    return () => animation.stop()
  }, [contentWidth, offset, reduceMotion])

  return (
    <Band frameClassName="border-y">
      <View
        className="gap-5 px-4 py-7"
        accessible
        accessibilityLabel="Built on open data from NASA POWER, MERRA-2, NOAA Climate Prediction Center, Oceanic Niño Index"
      >
        <Text className="text-sm text-muted-foreground">
          Built on open data from
        </Text>
        <View
          className="overflow-hidden"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
        >
          <ScrollView
            horizontal
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            onContentSizeChange={setContentWidth}
          >
            {/* NativeWind does not style Animated.View: the row lives inside. */}
            <Animated.View style={{ transform: [{ translateX: offset }] }}>
              <View className="flex-row">
                {[0, 1].map((track) => (
                  <View
                    key={track}
                    className="flex-row items-center gap-16 pr-16"
                  >
                    {TRACK.map((source, index) => (
                      <SourceMark key={`${source}-${index}`} source={source} />
                    ))}
                  </View>
                ))}
              </View>
            </Animated.View>
          </ScrollView>
          <EdgeFade />
        </View>
      </View>
    </Band>
  )
}
