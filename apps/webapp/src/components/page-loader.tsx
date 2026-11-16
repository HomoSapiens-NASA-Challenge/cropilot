import { BrandLogo } from "@/components/brand-mark"
import { useI18n } from "@/lib/i18n"

/** Shown by the router when a page takes long to load. Fast navigations never reach it. */
export function PageLoader() {
  const { t } = useI18n()
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50vh] w-full flex-1 flex-col items-center justify-center gap-5"
    >
      <BrandLogo className="size-10 animate-pulse motion-reduce:animate-none" />
      <div
        aria-hidden
        className="h-0.5 w-24 overflow-hidden rounded-full bg-border"
      >
        <div className="h-full w-1/4 animate-route-progress bg-primary motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-60" />
      </div>
      <span className="sr-only">{t("Loading")}</span>
    </div>
  )
}
