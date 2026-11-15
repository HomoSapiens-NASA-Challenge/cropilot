import type { ReactNode } from "react"

/** One block of the results: a title, a one-line lead and a flat panel with the content. */
export function ResultSection({
  title,
  lead,
  children,
}: {
  title: string
  lead?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex max-w-3xl flex-col gap-1">
        <h2 className="text-xl/7 font-light tracking-tight">{title}</h2>
        {lead && <p className="text-sm text-muted-foreground">{lead}</p>}
      </header>
      <div className="rounded-xl border bg-card p-4 sm:p-5">{children}</div>
    </section>
  )
}
