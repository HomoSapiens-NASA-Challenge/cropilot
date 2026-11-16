# Demo scope and next steps

Cropilot was built for the NASA Space Apps Challenge 2026. The demo is simplified on
purpose. It uses the data the team could access and process in that time, and it covers ten
zones with one public case each. This page states what is simplified, why, and what we would
add next. Results in the app are research scenarios for the agronomist to weigh, not forecasts or
field-validated recommendations.

## How "Years like this" works today

- **One zone at a time.** Each case compares the start of the 2026/27 campaign with that
  zone's own past campaigns, 1981/82 to 2024/25 (44 campaigns), and keeps the 7 closest.
  It never searches other zones: Pergamino's similar years come only from Pergamino's
  history, Charata's only from Charata's.
- **Two signals only.** NOAA ONI for July–September of the campaign's start year, and NASA
  POWER root-zone soil wetness (`GWETROOT`), averaged over 22–31 August at the zone's point.
  The distance is Euclidean on z-scores, with mean and standard deviation from past campaigns
  only. ONI is the same value for every zone, so the similar years differ between zones only
  because of their soil wetness.
- **What it does not compare.** Rainfall, temperature, soil profile, water table, management,
  sowing dates and prices are not part of the similarity. Two campaigns can be close on the
  two signals and differ in everything else.
- **Retrospective, not operational.** ONI for July–September includes September and is
  published after a late-August decision.
- **Measured, and modest.** The Years like this block reports the backtest of this method
  (307 campaigns, 10 zones, k = 7): the similar years predicted the gross margin no better
  than averaging all earlier campaigns (mean absolute error 123.2 against 122.3 USD/ha), and
  better than 7 random campaigns (p = 0.007). They are real, named campaigns to reason with,
  not a prediction.

The method is stored in `years_like_this.method` of every case bundle
(`apps/backend/app/modules/cases/resources/*.json`). The bundles are built offline by
[`scripts/demo_case`](../scripts/demo_case/README.md) from the team's market-model runs.

## Why it is simplified

**Time.** The challenge window was short. The demo keeps a small method that is backtested
and easy to explain, rather than a richer one the team could not validate in time.

**Data access.** NASA holds data that fits this problem better than what the demo uses, but
several products are read through Earthdata Login, and that access was not enabled for the
team in time. The demo therefore uses sources that can be read without that login:

| NASA product we wanted                        | What it would add                                               | Used in the demo instead                                  |
| --------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------- |
| SMAP L4 soil moisture (`SPL4SMGP`)            | Modeled surface and root-zone moisture, 9 km, every three hours | NASA POWER `GWETROOT` at one point per zone               |
| GLDAS land-surface model                      | Soil moisture by depth layer                                    | NASA POWER `GWETROOT`                                     |
| HLS imagery read directly from NASA (LP DAAC) | 30 m imagery for crop maps and vegetation before 2020           | The Planetary Computer mirror, which starts on 2020-01-01 |
| OPERA DSWx                                    | 30 m surface water: flooded fields and waterlogged lows         | Not used                                                  |
| AppEEARS subsets                              | Point and area extracts of NASA products without bulk downloads | Not used                                                  |

The team's research notes record these access requirements and the anonymous routes that
were tested.

## The sowing window: a first, brief version

Compare also shows a **sowing window** for maize: which summer sowing date held up best in
the campaigns that started like this one. The scope is deliberately narrow. It reuses the
water scenarios already in the case: one Pergamino reference footprint (268949), 1 m of soil
starting half full, NASA POWER weather, and summer sowing moved up to 14 days earlier or
later. It counts the days of water stress at the crop's critical stage in the five analog
campaigns that have runs. That is the data that was ready in the challenge window, not the
intended scope.

The full version would weigh every condition that decides a sowing date, with NASA data at
its core:

| Condition at sowing and through the season | NASA data                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| Water in the root zone                     | SMAP L4 root-zone moisture; NASA POWER `GWETROOT` (used today)           |
| Waterlogged lots and field access          | OPERA DSWx surface water; SMAP L4 surface moisture                       |
| Soil temperature for emergence             | Soil temperature by layer from GLDAS or SMAP L4                          |
| Frost after emergence, heat at flowering   | NASA POWER minimum and maximum air temperature                           |
| Rain and humidity around sowing            | NASA POWER and GPM IMERG precipitation; NASA POWER relative humidity     |
| How the lot's crop is developing           | HLS vegetation of the lot (the crop map and NDVI already shown in Field) |

It would also cover late (December) maize and delayed soybean, translate each date into yield
and margin, run for every zone and lot, and be checked against INTA sowing-date trials before
it is shown as more than a historical comparison.

## Next steps we did not get to

1. **Similar years across zones.** Search every zone for campaigns that started like this
   one and show them as context, kept apart from the zone's own results. A campaign from
   Charata does not say how Pergamino's yields respond to the same signals, so a cross-zone
   match needs yield anomalies or a per-zone response, not raw margins.
2. **Richer similarity.** Add rainfall, temperature, SMAP root-zone moisture by depth and the
   soil profile. Keep a new signal only if it beats the current method in the same backtest.
3. **Decision-date data.** Use only what is published by the decision date, so the method
   can run operationally each season instead of retrospectively.
4. **Longer satellite history.** With direct HLS access, extend crop maps and vegetation
   curves before 2020/21 and map lots beyond Pergamino and Paraná.
5. **Water beyond one footprint.** The water scenarios cover one Pergamino reference
   footprint (268949). Extend them to more fields and zones; add OPERA surface water for
   waterlogging.
6. **The farmer's own data.** A farm currently stores a name. Connect its geometry, soil,
   water table, management and the rotation it actually runs.

The water-model roadmap is in [`model-candidates.md`](model-candidates.md).
