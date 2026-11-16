import type { Strategy } from "@cropilot/api"
import { cn } from "cn"
import type { ReactNode } from "react"
import { Panel } from "@/features/case/block-frame"
import { translate, useI18n } from "@/lib/i18n"

/** One column per strategy from the wide breakpoint; stacked cells on a phone. */
export function StrategyGrid({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-5", className)}>
      {children}
    </div>
  )
}

/**
 * The cell of one strategy inside a row. The strategy name repeats here and is hidden
 * where the header cards line up above it, so a stacked cell still says whose it is.
 */
export function StrategyCell({
  strategy,
  children,
  className,
}: {
  strategy: Strategy
  children: ReactNode
  className?: string
}) {
  const { t } = useI18n("case")

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <p className="text-xs font-medium xl:hidden">{t(strategy.label)}</p>
      {children}
    </div>
  )
}

/** A row of the comparison: what it measures, the evidence chips, then its cells. */
export function ComparisonRow({
  title,
  description,
  evidence,
  controls,
  children,
}: {
  title: ReactNode
  description?: ReactNode
  evidence: ReactNode
  controls?: ReactNode
  children: ReactNode
}) {
  return (
    <Panel className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h3 className="font-medium">{title}</h3>
        {description && (
          <p className="max-w-3xl text-sm text-muted-foreground">
            {description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">{evidence}</div>
      </div>
      {controls}
      {children}
    </Panel>
  )
}

export function strategyLabel(
  strategies: ReadonlyArray<Strategy>,
  strategyId: string
): string {
  const strategy = strategies.find((entry) => entry.strategy_id === strategyId)
  if (!strategy) {
    throw new Error(`Unknown strategy id: ${strategyId}`)
  }
  return translate(strategy.label)
}
