import { cn } from "cn"

const STRAND_COUNT = 64
/** One strand in every eight carries the accent: most campaigns are not like this one. */
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

const STRAND_TONES = {
  plain: { base: "stroke-muted-foreground/25", accent: "stroke-primary/70" },
  inverse: {
    base: "stroke-inverse-foreground/15",
    accent: "stroke-highlight/80",
  },
} as const

/** Decorative: the lines carry no data. */
export function StrandsArt({
  tone = "plain",
  className,
}: {
  tone?: keyof typeof STRAND_TONES
  className?: string
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 760"
      preserveAspectRatio="xMaxYMin slice"
      fill="none"
      className={cn("pointer-events-none", className)}
    >
      {STRANDS.map((strand) => (
        <path
          key={strand.id}
          d={strand.path}
          strokeWidth={strand.isAccent ? 1.5 : 1}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          className={
            strand.isAccent
              ? STRAND_TONES[tone].accent
              : STRAND_TONES[tone].base
          }
        />
      ))}
    </svg>
  )
}
