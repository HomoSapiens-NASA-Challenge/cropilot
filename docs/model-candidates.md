# Five additional water-model candidates

Status: **proposals, not implemented or trained**. Evidence reviewed on 2026-11-14 against branch `modelos`, commit `d938a7995d85fdb4d7686548cddfcae99cc56698`.

These proposals add information to the existing [seasonal water/heat models and physical simulator](models.md) and [7/14-day regional wetness models](moisture-models.md). They are not the five components of a previously trained release. Three are potential statistical experiments; two extend physical scenario analysis without fitting a new estimator.

The product can use historical indicators to explain named analogous campaigns. Predictive versions remain separate research until they demonstrate useful performance and their input availability at the decision date is verified.

## Comparison and order of work

| Candidate                     | Additional question answered                                                                    | Method                                              | Data readiness                                                                   | Priority |
| ----------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------- | -------- |
| 1. Dry-spell duration         | Can a season with enough total rain still contain a long dry interval?                          | Historical indicator; optional Ridge/HGB experiment | Daily precipitation already installed at ten regional points                     | 3        |
| 2. Concentrated rainfall      | How much rain can accumulate within five consecutive days?                                      | Historical indicator; optional Ridge/HGB experiment | Same daily precipitation snapshot                                                | 4        |
| 3. Water stress by crop stage | During which modeled growth stage does each rotation run short of water?                        | Aggregation of the existing physical model          | Daily deficit, stress coefficient and assumed stage lengths already available    | 1        |
| 4. Sowing-date sensitivity    | How does shifting sowing change water reserves and stress across the same historical campaigns? | Paired physical simulations                         | Existing engine accepts calendars; local date ranges still need agronomic review | 2        |
| 5. River-station nitrate      | Does antecedent NASA weather improve estimates of measured nitrate at monitoring stations?      | Small HGB benchmark against station baselines       | Argentine laboratory labels audited; weather join still missing                  | 5        |

The first two implementation priorities are candidates 3 and 4: they directly explain the rotations already simulated. Candidates 1 and 2 can first contribute observed historical context, even if their predictive experiments fail. Candidate 5 is an independent water-quality investigation.

## 1. Dry-spell duration

**Output:** `max_dry_spell_days`, the longest run of days with daily precipitation below 1 mm inside a stated window. Start with the existing December 10–January 20 window to make comparisons consistent. Clip runs at both window boundaries; an incomplete weather window is missing, never a sequence of zero-rain days. This is a window-specific adaptation of [Climdex CDD](https://www.climdex.org/learn/indices/), not an annual CDD value.

**Contribution:** two campaigns can have similar total rain or P−ET0 but very different sequences of dry days. This indicator adds timing information that the current climate-balance target does not contain.

**Inputs and method:** reuse the frozen NASA POWER `PRECTOTCORR` series to calculate historical labels. For the optional seasonal experiment, reuse the existing predecision feature builder and compare regional training-set medians, Ridge and a small histogram gradient boosting regressor. Bound predictions to 0–42 days. Compare models with and without ONI; do not assume ENSO helps.

**Evaluation:** MAE in days, macro-average across regions, paired improvement over the regional baseline and uncertainty grouped by campaign. Inspect the longest observed spells separately. Do not introduce a classifier or an arbitrary agronomic damage threshold before the duration target is useful.

**Limits:** this is regional precipitation persistence. It does not measure plant water stress, which also depends on soil storage, crop demand and management. Historic label calculation is ready; predictive training and validation are pending.

## 2. Concentrated rainfall

**Output:** `max_5_day_precip_mm`, the largest sum over five consecutive complete days entirely inside the selected window. Use the same 42-day window initially. This adapts the [Climdex Rx5day definition](https://www.climdex.org/learn/indices/) to the experiment's window.

**Contribution:** distinguishes evenly distributed rain from a concentrated wet episode, even when seasonal totals or the dry/intermediate/wet label are similar. Show the historical five-day interval and its dates with each value.

**Inputs and method:** reuse the installed daily precipitation and seasonal feature pipeline. Compare a regional training median, Ridge and a small HGB regressor; clip negative predictions to zero. Use a fixed candidate set shared with candidate 1 rather than a broad search on a small number of campaigns.

**Evaluation:** MAE in mm, per-region errors and error on large events. Define any high-event threshold exclusively from training data. A tail subset with few independent campaigns cannot establish reliable extreme-event prediction; report its sample size.

**Limits:** regional gridded precipitation can miss local extremes. Neither this metric nor the simulator's bucket overflow estimates flooding, field trafficability, runoff, drainage partitioning or waterlogging damage. Those require additional hydrological observations and model structure.

## 3. Water stress by crop stage

**Output:** for each crop event and each of its four configured stages, return start/end dates, cumulative `crop_et_deficit_mm`, `stress_days` and `longest_stress_spell_days`. Deficit is the daily sum of potential minus actual crop ET; a stress day has the existing water-stress coefficient below one. Preserve the source scenario, soil capacity and initial-water assumption.

**Contribution:** the current comparison reports whole-crop water deficits. Stage summaries explain when a difference between rotations occurs and whether it shifts between historical campaigns.

**Inputs and method:** reuse `compare_water_scenarios` and its exported daily series. The frozen simulator already produces `crop_event_id`, `crop_et_deficit_mm` and `water_stress_coefficient`; the configuration supplies stage lengths. Add aggregation in Cropilot without modifying the checksum-pinned release. This is an extension of the existing [FAO-56-based water balance](https://www.fao.org/4/x0490e/x0490e0e.htm), not a separately trained ML model.

**Verification:** stage boundaries must partition the crop event exactly; stage deficits must sum to the whole-crop deficit; stress-day counts must not exceed stage duration; spells must stop at stage boundaries. Retain water-balance checks. Mathematical consistency does not constitute field validation.

**Limits:** the four stages are configured durations, not observed phenology. Do not rename a stage "flowering" without crop-specific evidence, convert its deficit to yield loss, or invent severity weights. The illustrative Río Cuarto case uses calendar assumptions that still require local review.

## 4. Sowing-date sensitivity

**Output:** a table of candidate sowing dates with initial available water, whole-crop and stage deficits, and paired changes relative to the current calendar for each historical campaign. Summarize median and range across campaigns while keeping individual years visible.

**Contribution:** converts an explanation of historical stress into a concrete management scenario for the agronomist to assess.

**Inputs and method:** reuse the physical simulator with explicit alternative calendars. An initial research grid can shift one crop event by −14, −7, 0, +7 and +14 days; these offsets are experimental settings, not locally recommended dates. Keep soil, weather, initial-water assumptions, crop coefficients and cycle lengths fixed in the first comparison. Use locally reviewed planting ranges before presenting agronomic recommendations.

Each alternative must pass existing overlap and weather-coverage validation. The engine also rejects crop cycles outside their configured campaign. Record rejected alternatives with reasons; do not silently shorten a cycle, remove a preceding crop, or reset water at sowing. Paired comparisons must use the same valid campaigns and initial-water scenarios.

**Evaluation:** verify that the zero-shift calendar reproduces the existing result and that each reported difference pairs identical conditions. Show sensitivity across initial-water assumptions. If selecting one date algorithmically, select only on training/validation campaigns and evaluate that fixed choice on later campaigns; choosing the best date separately after seeing each year's weather is a hindsight scenario, not a policy evaluation.

**Limits:** fixed stage durations do not model temperature-dependent development. Water-only improvements are not demonstrated yield or profit gains. This adds a bounded calendar comparison; rotation ranking and the RL policy remain separate team responsibilities.

## 5. River-station nitrate

**Output:** research estimate of nitrate expressed as nitrogen, `nitrate_mgN_L`, with station, sample date, uncertainty where supported and quality flags. Its spatial support is a river monitoring station, not a farm.

**Observed data:** the local extract of [UNEP GEMS/Water GFQA v3](https://zenodo.org/records/18459694) contains 1,586 Argentine `NO3N` records at 129 stations. Of these, 508 carry a less-than flag and 1,078 are uncensored. These counts were recalculated from the CSV. The metadata specifies nitrate as N; preserve mg N/L rather than silently treating it as nitrate-ion mass. Keep `NO2N` and `NOxN` separate.

**Missing preparation:** download and audit NASA weather at the monitoring stations, with caching by source grid where appropriate. The existing ten regional agricultural points cannot stand in for all stations. Join preceding precipitation over 7/30/90 days, temperature over 7/30 days, and calendar seasonality. Until sample time zones are verified, end weather windows at D−2 UTC. Point weather is a local proxy; upstream catchment rainfall is a separate hydrological extension.

**Method:** compare global and station training medians with a small HGB regressor on `log1p` concentration; invert predictions before scoring. Include an otherwise identical model without NASA weather to test its added value. Treat censored values through three declared training sensitivity scenarios: zero, half the reported bound and the bound. These substitutions are assumptions, not exact laboratory observations.

**Evaluation:** use 2018–2020 for training (626 raw records), 2021 for validation (466), and 2022 for test (482). Twelve records fall outside those years; audit all additional exclusions. Score MAE/RMSE only on uncensored measurements, with macro errors and uncertainty grouped by station. For censored samples report predictions above the recorded bound; being below it does not prove accuracy. Add a separate evaluation with held-out stations within 2018–2021, without claiming transfer to unseen river basins.

The existing [nitrate benchmark plan](https://github.com/HomoSapiens-NASA-Challenge/hub/blob/9fdef3b/research/ml-investigacion/nitrate-plan.md) proposes at least 10% lower station-macro MAE than the station baseline, improvement at held-out stations, and robustness across all three censoring assumptions. This is an internal experiment gate, not evidence that the model has met it. No nitrate model has been trained.

**Limits:** all Argentine records in this extract carry the source's `Fair` quality label and method code `0` (unknown). Nitrate at a river station cannot be attributed to a selected field's rotation, used as a fertilizer recommendation, or translated into a health alert from this benchmark.

## Shared protocol for the two seasonal ML experiments

1. Freeze target definitions, features and candidate settings before fitting. Reuse the current August 31 decision date with meteorological features ending July 31; do not add weather from the target window. Preserve source units, missing values, dates and hashes.
2. Retain complete campaigns across all ten regions in each partition: 1984–2006 training, 2007–2012 validation and 2013–2024 historical test. Preprocessing and regional baselines fit training only. Select each estimator on validation only.
3. There are 41 campaign blocks, not 410 independent climate realizations. Use campaign-block uncertainty and report regional heterogeneity. Add held-out-region evaluation before making transfer claims.
4. This historical test period has already been examined for other targets in the project. Label it as a reused historical benchmark, not a fresh prospective holdout. Do not tune against it after evaluation; any further selection needs a new validation design.
5. A learned model is useful only if it improves on its baseline with stable regional behavior and uncertainty supporting the improvement. Otherwise retain the baseline or historical indicator and publish the negative result. No performance number is promised here.
6. Revised reanalysis and ONI histories do not establish what was actually available on a past decision date. An operational forecast requires an availability/latency audit and prospective evaluation. Until then, use the results as research hindcasts.

## Scope and handoff

Yield, economic margin, soil carbon and rotation-policy work already have other team owners. These five proposals stay within water and water-quality analysis, while making any climate overlap explicit for coordination.

Pesticide contamination is not included as a sixth model. The inspected [SPRINT dataset](https://zenodo.org/records/12526872) describes farm pesticide application practices; those records alone are not concentration labels in water. A defensible contamination model first needs suitable measurements and a validated transport design.

Each implemented candidate should eventually ship with a versioned method, supported locations, units, named historical period, source hashes, assumptions, baseline, evaluation and status. Physical scenarios must identify assumed calendars and soil states. Raw observations and fitted weights remain outside Git. This proposal changes no API contract or frontend.

NASA POWER, GFQA and FAO references are already registered in the hub submission record; the additional Climdex methodology and SPRINT source review are registered there with their proposal-only scope. Codex (OpenAI) assisted this evidence review and proposal document.
