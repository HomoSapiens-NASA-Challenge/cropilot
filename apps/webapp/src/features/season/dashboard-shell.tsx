import type { SeasonDashboard } from "@cropilot/api"
import { Link } from "@tanstack/react-router"
import { FlaskConical } from "lucide-react"
import type { ReactNode } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { FOCUS, GLASS, isMock } from "./data"
import { longDate } from "./format"
import { TABS } from "./tabs"

/** Frame of every dashboard tab: field, campaign, tabs and what is synthetic. */
export function DashboardShell({
  data,
  children,
}: {
  data: SeasonDashboard
  children: ReactNode
}) {
  return (
    <TooltipProvider delay={150}>
      <Backdrop />
      {/* Muted text sits on glass, so it gets a darker step than on a plain page. */}
      <div className="flex flex-col gap-6 [--muted-foreground:var(--glass-muted-foreground)]">
        <header className="flex flex-col gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Seasons like this
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-balance sm:text-2xl">
              {data.field.name}{" "}
              <span className="font-normal text-muted-foreground">
                · {data.field.place}
              </span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Campaign {data.decision.campaign} · decision on{" "}
              {longDate(data.decision.decision_date)}
            </p>
          </div>
          <TabsNav />
          <DataBanner data={data} />
        </header>
        <div className="flex flex-col gap-6">{children}</div>
        <footer className="px-1 pb-4 text-xs text-muted-foreground">
          Decision support. It does not replace the agronomist&apos;s judgment.
        </footer>
      </div>
    </TooltipProvider>
  )
}

function TabsNav() {
  return (
    <nav
      aria-label="Sections"
      className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0"
    >
      <ul className={cn(GLASS, "flex w-max gap-1 rounded-full p-1 shadow-sm")}>
        {TABS.map((tab) => (
          <li key={tab.to}>
            <Link
              to={tab.to}
              activeOptions={{ exact: tab.to === "/dashboard" }}
              className={cn(
                "flex h-8 items-center rounded-full px-3.5 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:bg-foreground/10 aria-[current=page]:font-medium aria-[current=page]:text-foreground",
                FOCUS
              )}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** States which parts of the data are synthetic, built from the bundle itself. */
function DataBanner({ data }: { data: SeasonDashboard }) {
  if (data.data_status === "real") {
    return null
  }
  const mock: string[] = []
  if (data.strategies.some((s) => isMock(s.margin))) mock.push("margins")
  if (data.strategies.some((s) => isMock(s.carbon_input))) mock.push("carbon")
  if (isMock(data.season_start.root_zone_wetness)) {
    mock.push("this year's soil wetness")
  }
  const climateReal = !isMock({ source_ids: data.seasons_source_ids })
  if (!climateReal) mock.push("past-season climate")
  const list =
    mock.length > 1
      ? `${mock.slice(0, -1).join(", ")} and ${mock.at(-1)}`
      : mock[0]
  return (
    <p
      role="note"
      className={cn(
        GLASS,
        "flex w-fit items-start gap-2 rounded-2xl px-3 py-1.5 text-xs text-muted-foreground shadow-sm sm:rounded-full"
      )}
    >
      <FlaskConical className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>
        <strong className="font-medium text-foreground">
          {data.data_status === "mock" ? "Mock data." : "Partly mock data."}
        </strong>{" "}
        {list ? `Synthetic: ${list}. ` : ""}
        {climateReal ? "Past-season climate is real." : ""}
      </span>
    </p>
  )
}

/** Soft color fields behind the glass. Decorative only. */
function Backdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-(--page)"
    >
      <div className="absolute top-[-10%] left-[2%] size-[38rem] rounded-full bg-(--blob-1) blur-3xl" />
      <div className="absolute top-[30%] right-0 size-[34rem] rounded-full bg-(--blob-2) blur-3xl" />
      <div className="absolute bottom-[-12%] left-[25%] size-[36rem] rounded-full bg-(--blob-3) blur-3xl" />
      <div className="absolute top-[55%] left-[-8%] size-[28rem] rounded-full bg-(--blob-4) blur-3xl" />
    </div>
  )
}
