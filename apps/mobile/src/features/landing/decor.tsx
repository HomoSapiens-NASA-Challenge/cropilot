import { View } from "react-native"
import Svg, {
  Defs,
  Line,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg"
import { SVG_COLORS } from "@/lib/theme"
import { cn } from "@/lib/utils"

// Surfaces the web paints with CSS gradients and blurs, drawn with SVG here.
// They carry no data and stay in token colors.

/** The hero's soft primary glow from the top right, over an accent haze. */
export function HeroWash() {
  return (
    <View pointerEvents="none" className="absolute inset-0">
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="hero-accent" cx="15%" cy="35%" rx="85%" ry="45%">
            <Stop offset="0" stopColor={SVG_COLORS.accent} stopOpacity={1} />
            <Stop offset="1" stopColor={SVG_COLORS.accent} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="hero-primary" cx="100%" cy="0%" rx="95%" ry="55%">
            <Stop
              offset="0"
              stopColor={SVG_COLORS.primary}
              stopOpacity={0.12}
            />
            <Stop offset="1" stopColor={SVG_COLORS.primary} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#hero-accent)" />
        <Rect width="100%" height="100%" fill="url(#hero-primary)" />
      </Svg>
    </View>
  )
}

/** Feature cards fade from the card surface into the accent, like the web's `from-card from-40% to-accent`. */
export function CardGradient() {
  return (
    <View pointerEvents="none" className="absolute inset-0">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="card-fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.4" stopColor={SVG_COLORS.card} />
            <Stop offset="1" stopColor={SVG_COLORS.accent} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#card-fade)" />
      </Svg>
    </View>
  )
}

/** A short primary glint on a border, fading out at both ends. */
export function GlowLine({ className }: { className?: string }) {
  return (
    <View pointerEvents="none" className={cn("absolute h-px", className)}>
      <Svg width="100%" height="1">
        <Defs>
          <LinearGradient id="glow-line" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={SVG_COLORS.primary} stopOpacity={0} />
            <Stop offset="0.5" stopColor={SVG_COLORS.primary} stopOpacity={1} />
            <Stop offset="1" stopColor={SVG_COLORS.primary} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="1" fill="url(#glow-line)" />
      </Svg>
    </View>
  )
}

/** A dashed hairline. Native borders cannot dash a single side reliably. */
export function DashedRule() {
  return (
    <Svg width="100%" height="1">
      <Line
        x1="0"
        y1="0.5"
        x2="100%"
        y2="0.5"
        stroke={SVG_COLORS.border}
        strokeWidth={1}
        strokeDasharray="4 4"
      />
    </Svg>
  )
}
