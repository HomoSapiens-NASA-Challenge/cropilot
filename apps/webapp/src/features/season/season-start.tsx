import type { SeasonDashboard } from "@cropilot/api"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { FOCUS, GLASS } from "./data"
import { ENSO_LABEL, ensoHeadline, signed } from "./format"
import { ProvenanceTag } from "./provenance-tag"
import type { SelectSeason } from "./season-view"

const SECTION_TITLE =
  "text-xs font-medium tracking-wide text-muted-foreground uppercase"

/** 1 · How this season starts, and which past seasons started the same way. */
export function SeasonStart({
  data,
  onSelectSeason,
}: {
  data: SeasonDashboard
  onSelectSeason: SelectSeason
}) {
  const start = data.season_start
  const similar = data.seasons.filter((s) => s.is_similar)
  const first = data.seasons[0]?.season_id.slice(0, 4)
  const oni = start.oni.value
  const change = start.oni_change?.value ?? null
  const wetness = start.root_zone_wetness.value

  return (
    <Card className={GLASS}>
      <CardContent className="grid gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-10">
        <section aria-labelledby="start-title" className="flex flex-col gap-4">
          <h2 id="start-title" className={SECTION_TITLE}>
            How this season starts
          </h2>
          <div>
            <p className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {ensoHeadline(start.enso_phase, start.enso_strength)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Ocean index (ONI, {data.similarity.oni_window.label}):{" "}
              <span className="font-medium text-foreground tabular-nums">
                {oni === null ? "missing" : signed(oni)}
              </span>
              {change !== null && (
                <>
                  {" · "}
                  <span className="text-foreground">
                    {change > 0 ? "building" : change < 0 ? "fading" : "steady"}
                  </span>{" "}
                  <span className="tabular-nums">({signed(change)})</span>
                </>
              )}
            </p>
          </div>
          <div className="text-sm">
            <p className="text-muted-foreground">
              Root-zone wetness, late Aug (NASA POWER model)
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2">
              <span className="font-medium">
                {start.start_soil === null
                  ? "Missing"
                  : start.start_soil === "wet"
                    ? "Wetter than usual"
                    : "Drier than usual"}
              </span>
              {wetness !== null && (
                <span className="text-muted-foreground tabular-nums">
                  {wetness.toFixed(2)} of 1
                </span>
              )}
              <ProvenanceTag {...start.root_zone_wetness} />
            </p>
          </div>
        </section>

        <section
          aria-labelledby="similar-title"
          className="flex flex-col gap-3"
        >
          <h2 id="similar-title" className={SECTION_TITLE}>
            Past seasons that started like this
          </h2>
          <p className="text-sm">
            <span className="text-2xl font-semibold tabular-nums">
              {similar.length}
            </span>
            <span className="text-muted-foreground">
              {" "}
              of {data.seasons.length} seasons since {first}
            </span>
          </p>
          {similar.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5" aria-label="Similar seasons">
              {similar.map((s) => (
                <li key={s.season_id}>
                  <button
                    type="button"
                    onClick={(e) =>
                      onSelectSeason(s.season_id, e.currentTarget)
                    }
                    className={cn(
                      GLASS,
                      FOCUS,
                      "rounded-full px-2.5 py-1 text-xs font-medium tabular-nums shadow-sm transition hover:bg-foreground/5"
                    )}
                    aria-label={`${s.season_id}, ${ENSO_LABEL[s.enso_phase]} ${signed(s.oni)}. Open season details`}
                  >
                    {s.season_id}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No past season started like this one.
            </p>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">
            {data.similarity.rule}
          </p>
          {start.caveats.length > 0 && (
            <ul className="flex flex-col gap-1 text-xs leading-relaxed text-muted-foreground">
              {start.caveats.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  )
}
