import { TriangleAlert } from "lucide-react"
import type { ReactNode } from "react"

/** A problem the reader can act on: what went wrong, and the action that retries. */
export function Notice({
  children,
  action,
}: {
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-destructive/30 bg-card p-4 text-sm"
    >
      <p className="flex items-start gap-2">
        <TriangleAlert
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-destructive"
        />
        <span>{children}</span>
      </p>
      {action}
    </div>
  )
}
