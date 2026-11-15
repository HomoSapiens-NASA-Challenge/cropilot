import {
  findWaterEpisode,
  matchesWaterSettings,
  type WaterSettings,
} from "@cropilot/api"
import { useState } from "react"
import {
  campaignName,
  formatDate,
  formatMm,
  formatShare,
} from "@/features/case/case-format"
import type { CardComparison } from "@/features/case/mcp-rotation-schema"

const controlClass =
  "min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"

export function RotationCard({
  data,
  pending,
  interactive,
  onSettings,
  onSource,
}: {
  data: CardComparison
  pending: boolean
  interactive: boolean
  onSettings: (selection: WaterSettings) => void
  onSource: (url: string) => void
}) {
  const [campaignId, setCampaignId] = useState(
    data.analog_campaigns[0]?.scenario_id ?? null
  )
  const [notice, setNotice] = useState<string | null>(null)
  const campaign = data.analog_campaigns.find(
    (point) => point.scenario_id === campaignId
  )
  const settings = data.requested_water_selection
  const options = data.available_water_selections
  const water = data.water
  const disabled = pending || !interactive
  const available = (candidate: WaterSettings) =>
    options.some((item) => matchesWaterSettings(item, candidate))
  function changeStartingPoint(
    change: Partial<Pick<WaterSettings, "depth_m" | "initial_water_fraction">>
  ) {
    const candidate = { ...settings, ...change }
    const next = available(candidate)
      ? candidate
      : { ...candidate, summer_shift_days: 0 }
    setNotice(
      next.summer_shift_days !== settings.summer_shift_days
        ? "Requested Default date: shifted runs are unavailable for this profile. The controls show the last successful scenario."
        : null
    )
    if (available(next)) onSettings(next)
  }
  const sources = data.context.sources.filter((source) =>
    water?.meta.source_ids.includes(source.id)
  )
  return (
    <main
      className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:p-6"
      aria-busy={pending}
    >
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium text-primary">
          CROPILOT · HISTORICAL EVIDENCE
        </p>
        <h1 className="text-2xl font-light tracking-tight">
          Water across rotations
        </h1>
        <p className="text-sm text-muted-foreground">
          {data.context.zone_name} ·{" "}
          {water ? `Footprint ${water.field_id}` : "Regional case"}
        </p>
        <p className="text-xs text-muted-foreground">
          Fixed decision date: {formatDate(data.context.decision.decision_date)}
        </p>
        <p className="text-sm text-muted-foreground">
          Three continuous historical campaigns. Modeled scenarios, not a
          forecast or measured field water.
        </p>
      </header>
      {!water ? (
        <div className="rounded-xl border border-dashed p-4">
          <h2 className="font-medium">Water comparison unavailable</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            No released water scenarios for {data.context.zone_name}. Another
            region's results have not been substituted.
          </p>
        </div>
      ) : (
        <>
          <fieldset
            disabled={disabled}
            className="grid grid-cols-2 gap-3 rounded-xl border bg-muted/30 p-3 sm:grid-cols-3"
          >
            <legend className="px-1 text-sm font-medium">
              Scenario assumptions
            </legend>
            <label className="flex flex-col gap-2 text-xs">
              Profile depth
              <select
                className={controlClass}
                value={settings.depth_m}
                onChange={(event) =>
                  changeStartingPoint({ depth_m: Number(event.target.value) })
                }
              >
                {[...new Set(options.map((item) => item.depth_m))].map(
                  (depth) => (
                    <option key={depth} value={depth}>
                      {depth} m
                    </option>
                  )
                )}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-xs">
              Initial water
              <select
                className={controlClass}
                value={settings.initial_water_fraction}
                onChange={(event) =>
                  changeStartingPoint({
                    initial_water_fraction: Number(event.target.value),
                  })
                }
              >
                {[
                  ...new Set(
                    options.map((item) => item.initial_water_fraction)
                  ),
                ].map((fraction) => (
                  <option key={fraction} value={fraction}>
                    {formatShare(fraction)}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-span-2 flex flex-col gap-2 text-xs sm:col-span-1">
              Summer sowing date
              <select
                className={controlClass}
                value={settings.summer_shift_days}
                onChange={(event) => {
                  setNotice(null)
                  onSettings({
                    ...settings,
                    summer_shift_days: Number(event.target.value),
                  })
                }}
              >
                {[...water.summer_shift_days]
                  .sort((a, b) => a - b)
                  .map((shift) => (
                    <option
                      key={shift}
                      value={shift}
                      disabled={
                        !available({ ...settings, summer_shift_days: shift })
                      }
                    >
                      {shift === 0
                        ? "Default date"
                        : `${shift > 0 ? "+" : ""}${shift} days`}
                    </option>
                  ))}
              </select>
            </label>
          </fieldset>
          {notice && (
            <p role="status" className="text-sm text-muted-foreground">
              {notice}
            </p>
          )}
          {!interactive && (
            <p className="text-sm text-muted-foreground">
              This host does not support interactive tool calls. Ask the
              assistant to change the scenario.
            </p>
          )}
          <label className="flex flex-col gap-2 text-xs">
            Historical start campaign
            <select
              className={controlClass}
              disabled={pending}
              value={campaignId ?? ""}
              onChange={(event) => setCampaignId(event.target.value)}
            >
              {data.analog_campaigns.map((point) => (
                <option key={point.scenario_id} value={point.scenario_id}>
                  {point.campaign}
                  {water.episodes.some(
                    (episode) => episode.scenario_id === point.scenario_id
                  )
                    ? ""
                    : " · no water run"}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-muted-foreground">
            {campaign
              ? `Three campaigns from June ${campaign.start_year}. `
              : ""}
            Bars show the fraction of crop water demand unmet. Lower means less
            modeled deficit, not a crop recommendation.
          </p>
          <section
            aria-label="Rotation water comparison"
            className="flex flex-col gap-3"
          >
            {data.strategies.map((strategy) => {
              const episode = findWaterEpisode(
                water,
                strategy.strategy_id,
                campaignId,
                settings
              )
              return (
                <article
                  key={strategy.strategy_id}
                  className="rounded-xl border p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-medium">{strategy.label}</h2>
                    {strategy.is_current && (
                      <span className="text-xs text-muted-foreground">
                        Reference · unconfirmed
                      </span>
                    )}
                  </div>
                  {strategy.water_match === "closest" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Closest water match: same crops, a different phase of the
                      cycle.
                    </p>
                  )}
                  {episode ? (
                    <>
                      <div className="mt-3 flex items-baseline justify-between gap-2 tabular-nums">
                        <p className="text-2xl font-light tracking-tight">
                          {formatShare(episode.crop_demand_unmet_fraction)}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            unmet
                          </span>
                        </p>
                        <p className="text-sm">
                          {formatMm(episode.crop_et_deficit_mm)} deficit
                        </p>
                      </div>
                      <meter
                        aria-label={`${strategy.label}: unmet crop water`}
                        min={0}
                        max={100}
                        value={episode.crop_demand_unmet_fraction * 100}
                        aria-valuetext={`${formatShare(episode.crop_demand_unmet_fraction)} unmet crop water`}
                        className="sr-only"
                      />
                      <div
                        aria-hidden="true"
                        className="my-2 h-2 overflow-hidden rounded-lg bg-muted"
                      >
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${episode.crop_demand_unmet_fraction * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Demand {formatMm(episode.crop_et_potential_mm)} · water
                        at episode end {formatMm(episode.water_end_mm)}
                      </p>
                      <details className="mt-3 text-xs">
                        <summary className="min-h-8 cursor-pointer font-medium">
                          Crops and sowing dates
                        </summary>
                        <div className="flex flex-col gap-3">
                          {episode.crops.map((crop) => (
                            <div
                              key={`${crop.crop}-${crop.sowing_date}`}
                              className="border-t pt-3"
                            >
                              <p className="font-medium">
                                {crop.crop} · {campaignName(crop.campaign_year)}
                              </p>
                              <p className="mt-1">
                                Sown {formatDate(crop.sowing_date)}
                              </p>
                              <p>
                                Water at sowing{" "}
                                {formatMm(crop.water_at_sowing_mm)} · deficit{" "}
                                {formatMm(crop.crop_et_deficit_mm)}
                              </p>
                              <p>
                                Mid-season stress {crop.mid_season_stress_days}{" "}
                                days · coincident heat above 35°C{" "}
                                {crop.coincident_stress_heat_days} days
                              </p>
                            </div>
                          ))}
                          <p className="text-muted-foreground">
                            Generic crop stages and the 35°C heat screen are
                            research assumptions, not observed flowering or
                            validated crop damage.
                          </p>
                          <p className="break-all text-muted-foreground">
                            Released run: {episode.run_id}
                          </p>
                        </div>
                      </details>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      {strategy.water_strategy_id === null
                        ? "Not computed: no water simulation for this rotation."
                        : "No released water run for this campaign and settings."}
                    </p>
                  )}
                </article>
              )
            })}
          </section>
        </>
      )}
      <details className="rounded-xl border p-4 text-sm">
        <summary className="min-h-8 cursor-pointer font-medium">
          Sources and limits
        </summary>
        <div className="flex flex-col gap-4 text-xs text-muted-foreground">
          {water && <p>{water.meta.note}</p>}
          {(water ? sources : data.context.sources).map((source) => (
            <div key={source.id} className="border-t pt-3">
              <p className="font-medium text-foreground">{source.dataset}</p>
              <p>
                {source.provider} · {source.nature.replaceAll("_", " ")}
              </p>
              <p>
                {source.period} · {source.location}
              </p>
              {source.license && <p>{source.license}</p>}
              {source.url && (
                <button
                  type="button"
                  className="min-h-11 text-primary underline underline-offset-4"
                  onClick={() => {
                    if (source.url) onSource(source.url)
                  }}
                >
                  Open source: {source.provider}
                </button>
              )}
            </div>
          ))}
          {water?.limitations.map((limit) => (
            <p key={limit}>{limit}</p>
          ))}
          <p>{data.selection_note}</p>
          {data.context.limits.map((limit) => (
            <p key={limit.title}>
              <span className="font-medium">{limit.title}: </span>
              {limit.text}
            </p>
          ))}
        </div>
      </details>
      <p className="text-xs text-muted-foreground">
        Cropilot supports the agronomist and producer. Confirm soil water, water
        table, sowing date and crop cycle locally before deciding.
      </p>
    </main>
  )
}
