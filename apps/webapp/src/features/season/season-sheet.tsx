import type { Season, SeasonDashboard } from "@cropilot/api"
import { useRef } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { GLASS_STRONG, isMock } from "./data"
import { ENSO_LABEL, signed, usd } from "./format"
import { summarizeStrategy } from "./stats"

type Props = {
  data: SeasonDashboard
  seasonId: string | null
  onClose: () => void
  /** Element that gets focus back when the sheet closes. */
  opener: HTMLElement | null
}

const yesNo = (v: boolean | null) =>
  v === null ? "Not computed" : v ? "Yes" : "No"
const H3 =
  "mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase"
const DL =
  "grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 tabular-nums [&_dd]:text-right"

/** Drill-down: what happened in one past season. */
export function SeasonSheet({ data, seasonId, onClose, opener }: Props) {
  const found = data.seasons.find((s) => s.season_id === seasonId)
  // Keep the last season while the close animation runs, so the panel doesn't go blank.
  const last = useRef<Season | undefined>(undefined)
  if (found) {
    last.current = found
  }
  const season = found ?? last.current
  const mock = isMock(data.strategies[0].margin)

  return (
    <Sheet
      open={found !== undefined}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <SheetContent
        className={cn(
          GLASS_STRONG,
          "data-[side=right]:w-full data-[side=right]:sm:max-w-md"
        )}
        finalFocus={() => (opener?.isConnected ? opener : true)}
      >
        {season && (
          <>
            <SheetHeader className="p-6 pb-2">
              <SheetTitle className="text-2xl font-semibold tabular-nums">
                {season.season_id}
              </SheetTitle>
              <SheetDescription>
                {season.is_similar
                  ? "Started like this season."
                  : "Did not start like this season."}
              </SheetDescription>
            </SheetHeader>
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pb-6 text-sm">
              <section>
                <h3 className={H3}>How it started</h3>
                <dl className={DL}>
                  <dt className="text-muted-foreground">
                    Ocean (ONI, {data.similarity.oni_window.label})
                  </dt>
                  <dd>
                    {ENSO_LABEL[season.enso_phase]} {signed(season.oni)}
                  </dd>
                  <dt className="text-muted-foreground">
                    Root-zone wetness, late Aug
                  </dt>
                  <dd>
                    {season.start_soil === "wet" ? "Wetter" : "Drier"} than
                    usual · {season.root_zone_wetness.toFixed(2)}
                  </dd>
                </dl>
              </section>
              <section>
                <h3 className={H3}>What happened</h3>
                <dl className={DL}>
                  <dt className="text-muted-foreground">Rain, Oct–Mar</dt>
                  <dd>
                    {season.rain_oct_mar_mm === null
                      ? "Not computed"
                      : `${Math.round(season.rain_oct_mar_mm)} mm`}
                  </dd>
                  <dt className="text-muted-foreground">
                    {data.flag_defs.water_deficit_at_flowering.label}
                  </dt>
                  <dd>{yesNo(season.water_deficit_at_flowering)}</dd>
                  <dt className="text-muted-foreground">
                    {data.flag_defs.heat_at_flowering.label}
                  </dt>
                  <dd>{yesNo(season.heat_at_flowering)}</dd>
                  <dt className="text-muted-foreground">
                    {data.flag_defs.excess_water.label}
                  </dt>
                  <dd>{yesNo(season.excess_water)}</dd>
                </dl>
                {season.note && (
                  <p className="mt-2 text-muted-foreground">{season.note}</p>
                )}
              </section>
              <section>
                <h3 className={H3}>Margin, USD/ha{mock ? " (mock)" : ""}</h3>
                <dl className={DL}>
                  {data.strategies.map((strategy) => {
                    const value =
                      strategy.margin.by_season[season.season_id] ?? null
                    const median = summarizeStrategy(
                      strategy,
                      data.seasons
                    ).median
                    const diff =
                      value !== null && median !== null ? value - median : null
                    return (
                      <div key={strategy.strategy_id} className="contents">
                        <dt className="text-muted-foreground">
                          {strategy.name}
                          {strategy.is_current ? " (current)" : ""}
                        </dt>
                        <dd>
                          <span className="font-medium">{usd(value)}</span>
                          {diff !== null && (
                            <span className="block text-xs text-muted-foreground">
                              {diff >= 0 ? "+" : "−"}
                              {usd(Math.abs(diff))} vs median
                            </span>
                          )}
                        </dd>
                      </div>
                    )
                  })}
                </dl>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
