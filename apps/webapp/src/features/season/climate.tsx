import type { SeasonDashboard } from "@cropilot/api"
import type { LucideIcon } from "lucide-react"
import { CircleDashed, Droplets, Thermometer, Waves } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { FLAGS, type Flag, GLASS } from "./data"
import { plural } from "./format"
import { InfoPopover } from "./provenance-tag"
import { countFlag } from "./stats"

const ICON: Record<Flag, LucideIcon> = {
  water_deficit_at_flowering: Droplets,
  heat_at_flowering: Thermometer,
  excess_water: Waves,
}

/** 3 · Climate in the similar seasons. Labels and definitions come from the bundle. */
export function Climate({ data }: { data: SeasonDashboard }) {
  const similar = data.seasons.filter((s) => s.is_similar)
  return (
    <section aria-labelledby="climate-title" className="flex flex-col gap-3">
      <h2 id="climate-title" className="px-1 text-base font-semibold">
        Climate in similar seasons
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {FLAGS.map((flag) => {
          const definition = data.flag_defs[flag]
          const inSimilar = countFlag(similar, flag)
          const inAll = countFlag(data.seasons, flag)
          const notModeled = inAll.known === 0
          const Icon = notModeled ? CircleDashed : ICON[flag]
          const unknown = inSimilar.total - inSimilar.known
          return (
            <Card key={flag} size="sm" className={GLASS}>
              <CardContent className="flex h-full flex-col gap-1.5">
                <h3 className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1">{definition.label}</span>
                  <InfoPopover label={definition.label}>
                    {definition.definition}
                  </InfoPopover>
                </h3>
                {notModeled ? (
                  <>
                    <p className="text-lg font-semibold">Not modeled yet</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {definition.missing_note ??
                        "Shown as missing, not as zero."}
                    </p>
                  </>
                ) : similar.length === 0 ? (
                  <p className="text-lg font-semibold">No similar seasons</p>
                ) : (
                  <>
                    <p className="text-2xl font-semibold tabular-nums">
                      {inSimilar.yes}
                      <span className="text-base font-normal text-muted-foreground">
                        {" "}
                        of {plural(inSimilar.known, "season")}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      vs {inAll.yes} of {inAll.known} in all seasons
                      {unknown > 0 && ` · ${unknown} not computed`}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
