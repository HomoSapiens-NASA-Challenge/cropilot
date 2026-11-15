import type { ReactNode } from "react"
import { Text as InlineText, View } from "react-native"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"

const BAND_TONES = {
  plain: "bg-background",
  tinted: "bg-secondary",
  inverse: "bg-inverse",
} as const

/**
 * A full-width band of the page with the frame inside. Stacked bands line up
 * their side borders into the two guides that run down the whole page, as on
 * the web at phone width.
 */
export function Band({
  tone = "plain",
  className,
  frameClassName,
  children,
}: {
  tone?: keyof typeof BAND_TONES
  className?: string
  frameClassName?: string
  children: ReactNode
}) {
  return (
    <View className={cn("px-2", BAND_TONES[tone], className)}>
      <View
        className={cn(
          "border-x",
          tone === "inverse" ? "border-inverse-foreground/10" : "border-border",
          frameClassName
        )}
      >
        {children}
      </View>
    </View>
  )
}

const HEADING_TONES = {
  plain: { lead: "text-foreground", rest: "text-muted-foreground" },
  inverse: {
    lead: "text-inverse-foreground",
    rest: "text-inverse-muted-foreground",
  },
} as const

/**
 * Heading whose first sentence is ink and whose continuation is muted. The
 * lead is a plain React Native Text so it inherits the heading's size and font.
 */
export function SplitHeading({
  tone = "plain",
  lead,
  children,
  className,
}: {
  tone?: keyof typeof HEADING_TONES
  lead: string
  children: string
  className?: string
}) {
  return (
    <Text
      role="heading"
      className={cn(
        "text-2xl font-light leading-8 tracking-tight",
        HEADING_TONES[tone].rest,
        className
      )}
    >
      <InlineText className={HEADING_TONES[tone].lead}>{lead}</InlineText>{" "}
      {children}
    </Text>
  )
}
