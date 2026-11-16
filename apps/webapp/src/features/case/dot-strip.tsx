import { cn } from "cn"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useI18n } from "@/lib/i18n"

export type StripDot = {
  key: string
  /** `null` is a value that does not exist. It gets no dot. */
  value: number | null
  /** What a hover or focus says about the dot. */
  description: string
}

/** The range every strip of one row shares, so strips compare by position. */
export function stripDomain(
  values: ReadonlyArray<number | null>
): [number, number] | null {
  const present = values.filter((value) => value !== null)
  if (present.length === 0) return null
  const min = Math.min(...present)
  const max = Math.max(...present)
  const padding = (max - min || Math.abs(max) || 1) * 0.06
  return [min - padding, max + padding]
}

/**
 * One dot per campaign on a shared axis. The dots are buttons, so the value is also
 * reachable by keyboard and by touch. A thin line marks zero when the axis crosses it.
 */
export function DotStrip({
  dots,
  domain,
  format,
  className,
}: {
  dots: ReadonlyArray<StripDot>
  domain: [number, number] | null
  format: (value: number) => string
  className?: string
}) {
  const { t } = useI18n("case")

  const present = dots.filter((dot) => dot.value !== null)
  const missingCount = dots.length - present.length
  if (!domain || present.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("No value for any of the {value1} campaigns.", {
          value1: dots.length,
        })}
      </p>
    )
  }
  const [min, max] = domain
  const positionOf = (value: number) => ((value - min) / (max - min)) * 100
  const values = present.map((dot) => dot.value ?? 0)
  const lowest = Math.min(...values)
  const highest = Math.max(...values)

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="relative h-8">
        <span
          aria-hidden
          className="absolute inset-x-0 top-1/2 h-px bg-border"
        />
        {min < 0 && max > 0 && (
          <span
            aria-hidden
            className="absolute inset-y-0 w-px bg-foreground/40"
            style={{ left: `${positionOf(0)}%` }}
          />
        )}
        {present.map((dot) => (
          <Tooltip key={dot.key}>
            <TooltipTrigger
              aria-label={t(dot.description)}
              className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/80 ring-2 ring-background outline-none hover:bg-primary focus-visible:bg-primary focus-visible:ring-ring"
              style={{ left: `${positionOf(dot.value ?? 0)}%` }}
            />
            <TooltipContent>{t(dot.description)}</TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div className="flex justify-between gap-2 text-xs text-muted-foreground tabular-nums">
        <span>{format(lowest)}</span>
        <span>{format(highest)}</span>
      </div>
      {missingCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("{value1} {value2} no value.", {
            value1: missingCount,
            value2:
              missingCount === 1 ? t("campaign has") : t("campaigns have"),
          })}
        </p>
      )}
    </div>
  )
}
