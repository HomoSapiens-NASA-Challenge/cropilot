# Data and calculation provenance

The interface separates original data and references from the team's own calculations, so a result can be traced to its inputs without presenting it as an observation published by NASA, INTA or MAGyP. In every case view the external sources come first and the calculations sit in a collapsible section. Evidence popovers show the external inputs and keep the citation of the exact calculation behind the result. The links between the two live in `apps/webapp/src/features/case/source-lineage.ts`; contract identifiers, authors, links and values are unchanged.

| Reference              | Main external inputs                                                                          | Team result                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `team_market_model`    | NASA POWER, NOAA ONI, MAGyP yields and costs, A3 futures and agronomic references             | Analog campaigns, yield anomalies, gap-filling models and margin scenarios                               |
| `team_market_backtest` | The market model's inputs                                                                     | Evaluation against climatology and random campaigns; not an external observed dataset                    |
| `team_water_scenarios` | NASA POWER, SoilGrids, FTW footprint, INTA crop sequence, FAO and INTA methods and parameters | Water-balance, stress and sensitivity simulations                                                        |
| `team_crop_map`        | NASA HLS, INTA crop maps, FTW boundaries and NOAA context                                     | 2025/26 classification and derived indicators; the 2020/21-2024/25 history keeps its attribution to INTA |
| `team_rl_mdp`          | The market model's inputs: NASA POWER, NOAA, MAGyP and A3                                     | Tabular environment and evaluation of dynamic programming, Q-learning and fixed rotations                |
| `team_rl_lab`          | NASA POWER, MAGyP, FAO-56 and FAO-33, INTA calendars and World Bank prices                    | Water balance and policy evaluation, with explicit soil and cost assumptions                             |
| `team_analog_approach` | NASA POWER, NOAA and MAGyP                                                                    | Method note and descriptive analysis, including the 2017/18 counterexample                               |

The definitions and links of every reference are in [`scripts/demo_case/sources.py`](../scripts/demo_case/sources.py); the water-balance references are in [`scripts/demo_case/build.py`](../scripts/demo_case/build.py), [water-strategies.md](water-strategies.md) and [crop-map.md](crop-map.md).

`source-lineage.ts` links the main inputs that already exist as a `SourceRef`. It does not replace the full parameter or reference list of each method: INTA calendars, FAO-33, World Bank prices and the lab's assumptions are named in the text and documented in the linked method. No license is shown where the source record does not declare one. The reference counter includes linked inputs, without duplicates.
