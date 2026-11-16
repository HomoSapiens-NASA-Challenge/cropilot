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
import { useI18n } from "@/lib/i18n"

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
  const { t } = useI18n("case")

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
          {t("CROPILOT · HISTORICAL EVIDENCE")}
        </p>
        <h1 className="text-2xl font-light tracking-tight">
          {t("Water across rotations")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {data.context.zone_name} ·{" "}
          {water
            ? t("Footprint {value1}", { value1: water.field_id })
            : t("Regional case")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("Fixed decision date: {value1}", {
            value1: formatDate(data.context.decision.decision_date),
          })}
        </p>
        <p className="text-sm text-muted-foreground">
          {t(
            "Three continuous historical campaigns. Modeled scenarios, not a forecast or measured field water."
          )}
        </p>
      </header>
      {!water ? (
        <div className="rounded-xl border border-dashed p-4">
          <h2 className="font-medium">{t("Water comparison unavailable")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t(
              "No released water scenarios for {value1}. Another region's results have not been substituted.",
              { value1: data.context.zone_name }
            )}
          </p>
        </div>
      ) : (
        <>
          <fieldset
            disabled={disabled}
            className="grid grid-cols-2 gap-3 rounded-xl border bg-muted/30 p-3 sm:grid-cols-3"
          >
            <legend className="px-1 text-sm font-medium">
              {t("Scenario assumptions")}
            </legend>
            <label className="flex flex-col gap-2 text-xs">
              {t("Profile depth")}
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
                      {t("{value1} m", { value1: depth })}
                    </option>
                  )
                )}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-xs">
              {t("Initial water")}
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
              {t("Summer sowing date")}
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
                        ? t("Default date")
                        : t("{value1}{value2} days", {
                            value1: shift > 0 ? "+" : "",
                            value2: shift,
                          })}
                    </option>
                  ))}
              </select>
            </label>
          </fieldset>
          {notice && (
            <p role="status" className="text-sm text-muted-foreground">
              {t(notice)}
            </p>
          )}
          {!interactive && (
            <p className="text-sm text-muted-foreground">
              {t(
                "This host does not support interactive tool calls. Ask the assistant to change the scenario."
              )}
            </p>
          )}
          <label className="flex flex-col gap-2 text-xs">
            {t("Historical start campaign")}
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
                    : t(" · no water run")}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-muted-foreground">
            {t(
              "{value1}Bars show the fraction of crop water demand unmet. Lower means less modeled deficit, not a crop recommendation.",
              {
                value1: campaign
                  ? t("Three campaigns from June {value1}. ", {
                      value1: campaign.start_year,
                    })
                  : "",
              }
            )}
          </p>
          <section
            aria-label={t("Rotation water comparison")}
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
                    <h2 className="text-sm font-medium">{t(strategy.label)}</h2>
                    {strategy.is_current && (
                      <span className="text-xs text-muted-foreground">
                        {t("Reference · unconfirmed")}
                      </span>
                    )}
                  </div>
                  {strategy.water_match === "closest" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t(
                        "Closest water match: same crops, a different phase of the cycle."
                      )}
                    </p>
                  )}
                  {episode ? (
                    <>
                      <div className="mt-3 flex items-baseline justify-between gap-2 tabular-nums">
                        <p className="text-2xl font-light tracking-tight">
                          {formatShare(episode.crop_demand_unmet_fraction)}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            {t("unmet")}
                          </span>
                        </p>
                        <p className="text-sm">
                          {t("{value1} deficit", {
                            value1: formatMm(episode.crop_et_deficit_mm),
                          })}
                        </p>
                      </div>
                      <meter
                        aria-label={t("{value1}: unmet crop water", {
                          value1: t(strategy.label),
                        })}
                        min={0}
                        max={100}
                        value={episode.crop_demand_unmet_fraction * 100}
                        aria-valuetext={t("{value1} unmet crop water", {
                          value1: formatShare(
                            episode.crop_demand_unmet_fraction
                          ),
                        })}
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
                        {t("Demand {value1} · water at episode end {value2}", {
                          value1: formatMm(episode.crop_et_potential_mm),
                          value2: formatMm(episode.water_end_mm),
                        })}
                      </p>
                      <details className="mt-3 text-xs">
                        <summary className="min-h-8 cursor-pointer font-medium">
                          {t("Crops and sowing dates")}
                        </summary>
                        <div className="flex flex-col gap-3">
                          {episode.crops.map((crop) => (
                            <div
                              key={`${crop.crop}-${crop.sowing_date}`}
                              className="border-t pt-3"
                            >
                              <p className="font-medium">
                                {t(crop.crop)} ·{" "}
                                {campaignName(crop.campaign_year)}
                              </p>
                              <p className="mt-1">
                                {t("Sown {value1}", {
                                  value1: formatDate(crop.sowing_date),
                                })}
                              </p>
                              <p>
                                {t(
                                  "Water at sowing {value1} · deficit {value2}",
                                  {
                                    value1: formatMm(crop.water_at_sowing_mm),
                                    value2: formatMm(crop.crop_et_deficit_mm),
                                  }
                                )}
                              </p>
                              <p>
                                {t(
                                  "Mid-season stress {value1} days · coincident heat above 35°C {value2} days",
                                  {
                                    value1: crop.mid_season_stress_days,
                                    value2: crop.coincident_stress_heat_days,
                                  }
                                )}
                              </p>
                            </div>
                          ))}
                          <p className="text-muted-foreground">
                            {t(
                              "Generic crop stages and the 35°C heat screen are research assumptions, not observed flowering or validated crop damage."
                            )}
                          </p>
                          <p className="break-all text-muted-foreground">
                            {t("Released run: {value1}", {
                              value1: episode.run_id,
                            })}
                          </p>
                        </div>
                      </details>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      {strategy.water_strategy_id === null
                        ? t(
                            "Not computed: no water simulation for this rotation."
                          )
                        : t(
                            "No released water run for this campaign and settings."
                          )}
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
          {t("Sources and limits")}
        </summary>
        <div className="flex flex-col gap-4 text-xs text-muted-foreground">
          {water?.meta.note && <p>{t(water.meta.note)}</p>}
          {(water ? sources : data.context.sources).map((source) => (
            <div key={source.id} className="border-t pt-3">
              <p className="font-medium text-foreground">{source.dataset}</p>
              <p>
                {source.provider} · {t(source.nature.replaceAll("_", " "))}
              </p>
              <p>
                {t(source.period)} · {t(source.location)}
              </p>
              {source.license && <p>{t(source.license)}</p>}
              {source.url && (
                <button
                  type="button"
                  className="min-h-11 text-primary underline underline-offset-4"
                  onClick={() => {
                    if (source.url) onSource(source.url)
                  }}
                >
                  {t("Open source: {value1}", { value1: source.provider })}
                </button>
              )}
            </div>
          ))}
          {water?.limitations.map((limit) => (
            <p key={limit}>{t(limit)}</p>
          ))}
          <p>{t(data.selection_note)}</p>
          {data.context.limits.map((limit) => (
            <p key={limit.title}>
              <span className="font-medium">{t(limit.title)}: </span>
              {t(limit.text)}
            </p>
          ))}
        </div>
      </details>
      <p className="text-xs text-muted-foreground">
        {t(
          "Cropilot supports the agronomist and producer. Confirm soil water, water table, sowing date and crop cycle locally before deciding."
        )}
      </p>
    </main>
  )
}
