import { cn } from "cn"
import type { ComponentProps, ReactNode } from "react"

const BAND_TONES = {
  plain: "bg-background",
  tinted: "bg-secondary",
  inverse: "bg-inverse text-inverse-foreground",
} as const

/**
 * A full-width band of the page with the centered frame inside. Stacked bands
 * line up their side borders into the two guides that run down the whole page.
 */
export function Band({
  tone = "plain",
  className,
  frameClassName,
  children,
  ...props
}: ComponentProps<"section"> & {
  tone?: keyof typeof BAND_TONES
  frameClassName?: string
}) {
  return (
    <section
      className={cn("px-2 sm:px-4", BAND_TONES[tone], className)}
      {...props}
    >
      <div
        className={cn(
          "mx-auto max-w-316 border-x",
          tone === "inverse" && "border-inverse-foreground/10",
          frameClassName
        )}
      >
        {children}
      </div>
    </section>
  )
}

const HEADING_TONES = {
  plain: { lead: "text-foreground", rest: "text-muted-foreground" },
  inverse: {
    lead: "text-inverse-foreground",
    rest: "text-inverse-muted-foreground",
  },
} as const

/** Heading whose first sentence is ink and whose continuation is muted. */
export function SplitHeading({
  as: Tag = "h2",
  tone = "plain",
  lead,
  children,
  className,
}: {
  as?: "h1" | "h2"
  tone?: keyof typeof HEADING_TONES
  lead: string
  children: ReactNode
  className?: string
}) {
  return (
    <Tag
      className={cn(
        "text-2xl/8 font-light tracking-tight text-pretty sm:text-3xl/9",
        HEADING_TONES[tone].rest,
        className
      )}
    >
      <span className={HEADING_TONES[tone].lead}>{lead}</span> {children}
    </Tag>
  )
}
