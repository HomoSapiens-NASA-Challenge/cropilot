import { Sprout } from "lucide-react-native"
import { View } from "react-native"
import Svg, { Path, Polygon, Rect } from "react-native-svg"
import { Icon } from "@/components/ui/icon"
import { SVG_COLORS } from "@/lib/theme"
import { cn } from "@/lib/utils"

export function BrandLogo({ className }: { className?: string }) {
  return (
    <View
      className={cn(
        "size-8 shrink-0 items-center justify-center rounded-lg bg-primary",
        className
      )}
    >
      <Icon as={Sprout} className="text-primary-foreground" size={16} />
    </View>
  )
}

const VIEWBOX_WIDTH = 312
const VIEWBOX_HEIGHT = 84
const WORDMARK_HEIGHT = 24
const WORDMARK_WIDTH = (WORDMARK_HEIGHT * VIEWBOX_WIDTH) / VIEWBOX_HEIGHT

/** The Cropilot wordmark. It is drawn in the foreground color. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Cropilot"
      className={className}
    >
      <Svg
        viewBox="13 11 312 84"
        width={WORDMARK_WIDTH}
        height={WORDMARK_HEIGHT}
        fill={SVG_COLORS.foreground}
      >
        <Path d="M 61,38 A 26,27 0 1 0 61,68 L 48,61 A 12,13 0 1 1 48,45 Z" />
        <Path d="M 65,32 H 79 V 40 C 82,34 87,31 95,31 V 45 C 85,45 80,49 80,58 V 78 H 65 Z" />
        <Path
          fillRule="evenodd"
          d="M 120,31 C 134,31 144,41 144,54.5 C 144,68 134,78 120,78 C 106,78 96,68 96,54.5 C 96,41 106,31 120,31 Z M 120,44 C 113.5,44 110,48.5 110,54.5 C 110,60.5 113.5,65 120,65 C 126.5,65 130,60.5 130,54.5 C 130,48.5 126.5,44 120,44 Z"
        />
        <Path
          fillRule="evenodd"
          d="M 148,32 H 162 V 37 C 165,33 170,31 176,31 C 188,31 196,41 196,54.5 C 196,68 188,78 176,78 C 170,78 165,76 163,72 V 95 H 148 Z M 172,44 C 166,44 162.5,48.5 162.5,54.5 C 162.5,60.5 166,65 172,65 C 178,65 181.5,60.5 181.5,54.5 C 181.5,48.5 178,44 172,44 Z"
        />
        <Polygon points="201,15 216,11 216,25 201,25" />
        <Rect x="201" y="32" width="15" height="46" />
        <Rect x="221" y="13" width="15" height="65" />
        <Path
          fillRule="evenodd"
          d="M 264,31 C 278,31 288,41 288,54.5 C 288,68 278,78 264,78 C 250,78 240,68 240,54.5 C 240,41 250,31 264,31 Z M 264,44 C 257.5,44 254,48.5 254,54.5 C 254,60.5 257.5,65 264,65 C 270.5,65 274,60.5 274,54.5 C 274,48.5 270.5,44 264,44 Z"
        />
        <Polygon points="292,32 325,32 325,44 289,44" />
        <Path d="M 299,18 L 314,14 L 314,61 C 314,65 316,66 321,66 H 325 V 78 H 316 C 304,78 299,72 299,60 Z" />
      </Svg>
    </View>
  )
}
