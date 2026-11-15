import { cn } from "cn"
import { CircleSlash, type LucideIcon } from "lucide-react"
import { createContext, type ReactNode, useContext } from "react"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

const BlockHeadersContext = createContext(true)

/** An app screen has its own page header, so the blocks inside it drop theirs. */
export function HideBlockHeaders({ children }: { children: ReactNode }) {
  return (
    <BlockHeadersContext.Provider value={false}>
      {children}
    </BlockHeadersContext.Provider>
  )
}

/** One block of the case: an anchor, a title, a one-line lead and the content. */
export function BlockSection({
  id,
  title,
  lead,
  children,
  className,
}: {
  id?: string
  title: ReactNode
  lead?: ReactNode
  children: ReactNode
  className?: string
}) {
  const showHeader = useContext(BlockHeadersContext)
  return (
    <section
      id={id}
      className={cn("flex scroll-mt-36 flex-col gap-6", className)}
    >
      {showHeader && (
        <header className="flex max-w-3xl flex-col gap-2">
          <h2 className="text-2xl/8 font-light tracking-tight text-balance sm:text-3xl/9">
            {title}
          </h2>
          {lead && <p className="text-muted-foreground">{lead}</p>}
        </header>
      )}
      {children}
    </section>
  )
}

/** A flat panel of the page flow: thin border, no shadow. */
export function Panel({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-4 sm:p-5", className)}>
      {children}
    </div>
  )
}

/** A figure with its label and, below it, the evidence that backs it. */
export function Stat({
  label,
  value,
  detail,
  evidence,
}: {
  label: ReactNode
  value: ReactNode
  detail?: ReactNode
  evidence?: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-4xl font-light tracking-tight tabular-nums">
        {value}
      </span>
      {detail && (
        <span className="text-sm text-muted-foreground">{detail}</span>
      )}
      {evidence}
    </div>
  )
}

/** A sentence the reader must not miss, such as a limit. Accent only on the icon and edge. */
export function Callout({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: LucideIcon
  title: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div
      role="note"
      className={cn(
        "flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4",
        className
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="font-medium">{title}</p>
        <div className="flex flex-col gap-2 text-muted-foreground">
          {children}
        </div>
      </div>
    </div>
  )
}

/** Stands where a number would be when the data does not reach it. No figures, ever. */
export function NotAvailable({
  title = "Not available for this region yet",
  description,
  children,
  className,
}: {
  title?: string
  description?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <Empty className={cn("border bg-card py-12", className)}>
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="size-10 border bg-background text-primary"
        >
          <CircleSlash />
        </EmptyMedia>
        <EmptyTitle className="text-xl font-light">{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {children}
    </Empty>
  )
}

/** Hatched strip for something Cropilot did not compute, with the reason. */
export function NotComputedRow({
  title,
  reason,
  className,
}: {
  title: ReactNode
  reason: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg border border-dashed px-3 py-2.5 text-sm",
        className
      )}
      style={{
        backgroundImage:
          "repeating-linear-gradient(135deg, transparent 0 7px, var(--border) 7px 8px)",
      }}
    >
      <span className="font-medium">
        {title}{" "}
        <span className="font-normal text-muted-foreground">
          · Not computed
        </span>
      </span>
      <span className="text-muted-foreground">{reason}</span>
    </div>
  )
}
