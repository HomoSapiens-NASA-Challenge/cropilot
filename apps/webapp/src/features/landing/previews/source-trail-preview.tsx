import { FileSearch } from "lucide-react"
import {
  PlaceholderLine,
  PreviewWindow,
} from "@/features/landing/previews/preview-window"
import { useI18n } from "@/lib/i18n"

// The source line is real: it is the one Cropilot shows for soil water.
const SOURCE_FIELDS = [
  { label: "Dataset", value: "NASA POWER · GWETROOT" },
  { label: "Period", value: "Daily, since 1981" },
  { label: "Location", value: "Grid cell of about 55 × 57 km" },
] as const

export function SourceTrailPreview({ className }: { className?: string }) {
  const { t } = useI18n("landing")
  return (
    <PreviewWindow title={t("Soil water at start")} className={className}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2.5">
          <PlaceholderLine className="h-3 w-20" />
          <PlaceholderLine className="w-2/3" />
        </div>
        <dl className="flex flex-col divide-y rounded-lg border bg-background/70 text-xs">
          {SOURCE_FIELDS.map((field) => (
            <div
              key={field.label}
              className="flex items-baseline justify-between gap-4 px-3 py-2"
            >
              <dt className="text-muted-foreground">{t(field.label)}</dt>
              <dd className="text-right font-medium">{t(field.value)}</dd>
            </div>
          ))}
        </dl>
        <p className="flex items-center gap-1.5 text-xs text-primary">
          <FileSearch className="size-3.5" />
          {t("Open the raw series")}
        </p>
      </div>
    </PreviewWindow>
  )
}
