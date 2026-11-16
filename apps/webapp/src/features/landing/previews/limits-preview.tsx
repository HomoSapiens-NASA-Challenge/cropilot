import { PreviewWindow } from "@/features/landing/previews/preview-window"
import { useI18n } from "@/lib/i18n"

// Real results of the team's own backtests, copied as measured. The preview says so in its badge.
const MEASURED_ROWS = [
  { label: "Beat random sets of 7 years", value: "p = 0.007" },
  { label: "Where the signal shows", value: "Marcos Juárez, Río Cuarto" },
  {
    label: "Planner vs best fixed rotation",
    value: "-3 USD/ha/year (95% CI -8 to +3)",
  },
] as const

export function LimitsPreview({ className }: { className?: string }) {
  const { t } = useI18n("landing")
  return (
    <PreviewWindow
      title={t("Measured limits")}
      badge={t("Team backtests")}
      className={className}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium">
            {t("Years like this against climatology, margin backtest")}
          </span>
          <span className="text-3xl font-light tracking-tight tabular-nums">
            -0.7%
          </span>
          <span className="text-xs text-muted-foreground">
            {t(
              "error against climatology: a tie. 7 analogs per campaign, 307 campaigns, 10 zones."
            )}
          </span>
        </div>
        <dl className="flex flex-col divide-y rounded-lg border bg-background/70 text-xs">
          {MEASURED_ROWS.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-4 px-3 py-2"
            >
              <dt className="text-muted-foreground">{t(row.label)}</dt>
              <dd className="text-right font-medium">{t(row.value)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </PreviewWindow>
  )
}
