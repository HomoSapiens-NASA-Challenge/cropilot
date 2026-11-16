import { View } from "react-native"
import Svg, { Path } from "react-native-svg"
import { SVG_COLORS } from "@/lib/theme"
import { cn } from "@/lib/utils"

const STRAND_COUNT = 64
const ACCENT_EVERY = 8

type Strand = { id: number; path: string; isAccent: boolean }

// A ribbon of lines that enters from the top and twists out to the right edge.
// The first strand at the top is the last one at the edge, which makes the twist.
const STRANDS: ReadonlyArray<Strand> = Array.from(
  { length: STRAND_COUNT },
  (_, id) => {
    const t = id / (STRAND_COUNT - 1)
    const startX = 700 + 430 * t
    const endY = 250 + 470 * t
    const path = [
      `M ${startX.toFixed(1)} -20`,
      `C ${(startX - 40 + 120 * t).toFixed(1)} ${(210 + 90 * t).toFixed(1)},`,
      `${(1010 + 190 * t).toFixed(1)} ${(endY - 250 + 120 * t).toFixed(1)},`,
      `1460 ${endY.toFixed(1)}`,
    ].join(" ")
    return { id, path, isAccent: id % ACCENT_EVERY === ACCENT_EVERY - 3 }
  }
)

// Decorative: the lines carry no data. Muted strands at 25% opacity, accent strands in primary at 70%.
export function StrandsArt({
  className,
  tone = "plain",
}: {
  className?: string
  tone?: "plain" | "inverse"
}) {
  return (
    <View pointerEvents="none" className={cn("overflow-hidden", className)}>
      <Svg
        viewBox="0 0 1440 760"
        preserveAspectRatio="xMaxYMin slice"
        fill="none"
        width="100%"
        height="100%"
      >
        {STRANDS.map((strand) => (
          <Path
            key={strand.id}
            d={strand.path}
            stroke={
              strand.isAccent
                ? tone === "inverse"
                  ? SVG_COLORS.highlight
                  : SVG_COLORS.primary
                : tone === "inverse"
                  ? SVG_COLORS.inverseForeground
                  : SVG_COLORS.mutedForeground
            }
            strokeOpacity={
              strand.isAccent
                ? tone === "inverse"
                  ? 0.8
                  : 0.7
                : tone === "inverse"
                  ? 0.15
                  : 0.25
            }
            strokeWidth={strand.isAccent ? 1.5 : 1}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </Svg>
    </View>
  )
}
