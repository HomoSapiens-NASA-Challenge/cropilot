import { useRouterState } from "@tanstack/react-router"
import { cn } from "cn"
import { useI18n } from "@/lib/i18n"

export function RouteProgress() {
  const { t } = useI18n()
  const isNavigating = useRouterState({
    select: (state) => state.isLoading || state.status === "pending",
  })

  return (
    <div
      aria-hidden={isNavigating ? undefined : true}
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden transition-opacity duration-300",
        isNavigating ? "opacity-100" : "opacity-0"
      )}
    >
      {isNavigating && (
        <div
          role="progressbar"
          aria-label={t("Loading page")}
          className="h-full w-1/4 animate-route-progress bg-primary motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-60"
        />
      )}
    </div>
  )
}
