# simulator

Crop-rotation simulator for the HomoSapiens project (NASA Space Apps Challenge 2026, "Field Shift: Adapting Farms with NASA Data"). Given a field and a rotation, it estimates what would have happened to that rotation in past seasons, and it exposes the same model as a Gymnasium environment so that agents can search for rotation strategies.

Every output is a **simulated scenario, not an agronomic recommendation**. It supports the judgment of the agronomist and the farmer; it does not replace it.

## Run

```sh
uv sync
uv run python scripts/prepare_data.py   # downloads NASA POWER, MAGyP, NOAA ONI and SoilGrids into data/
uv run python scripts/replay.py --field pergamino --start 2021 --campaigns 3
```

Tests: `uv run pytest`. Lint and format: `uv run ruff check . && uv run ruff format .`. Per-field validation against reported yields: `uv run python scripts/validate.py`.

## What it simulates

A daily soil water balance (FAO-56) driven by **NASA POWER** weather: rain fills one bucket of plant-available water, crops and bare soil draw from it, and what is left is carried into the next campaign. Crop yield is the field's attainable yield reduced by the water the crop missed (FAO-33 yield response). The engine is a port of the team's research lab (`research/rl/lab` in the hub) and reproduces its numbers: the lab's 41-campaign replay of Pergamino is matched to 1e-6.

A campaign runs from June 1 to May 31 and is decided in two moments:

| Decision | Options | What is known |
|---|---|---|
| June 1 | wheat, or fallow | soil water, El Niño index of February to April |
| End of August | after fallow: first soybean, maize or fallow. After wheat: second soybean or fallow | soil water after the winter months, El Niño index of July to September |

Only soil water (and the state of the soil surface) passes from one campaign to the next. Nitrogen, carbon, residue cover, diseases and weeds are **not** modelled, so the model cannot say that a diverse rotation is better for the soil; it can only say what each sequence does to water, yield and margin.

## Fields

A field is a record: location, soil water capacity, attainable yields and a climate summary, each with its source. Adding a field means adding a row to `configs/fields.csv` and running `prepare_data.py` again. The ten seed fields are reference points for ten departments, not surveyed farms.

| Input | Source | Scale |
|---|---|---|
| Weather and reference evapotranspiration | NASA POWER daily, 1984 to 2025 | grid cell of about 55 km |
| Soil water capacity | ISRIC SoilGrids 2.0, water content at 33 and 1500 kPa, 0 to 60 cm | 250 m pixel, modelled |
| Attainable yield | MAGyP department statistics, 90th percentile of 1984/85 to 2012/13 | department |
| El Niño index | NOAA Oceanic Niño Index | global |
| Crop coefficients, stages, yield response | FAO-56 and FAO-33 tables | generic |
| Sowing dates | INTA Pergamino trial reports | sourced for 30° to 35° S, assumed elsewhere |
| Prices and costs | World Bank Pink Sheet, October 2026; assumed costs | scenario |

Every constant is a row of `configs/parameters.csv` with its unit, source and a status, `SOURCED` or `ASSUMPTION`. A crop is only offered on a field that has a real yield record for it: where MAGyP has too few campaigns of second soybean, or repeats the first-soybean figure, that crop is not simulated.

## Environment

```python
import numpy as np
import rotation_sim

env = rotation_sim.make_env(split="train")  # or gymnasium.make("RotationSim-v0")
obs, info = env.reset(seed=0)
done = False
while not done:
    action = np.random.choice(np.flatnonzero(obs["action_mask"]))
    obs, reward, done, _, info = env.step(action)
```

- **Episode:** one field over three consecutive campaigns (`horizon_campaigns`), two steps per campaign. The field changes between episodes.
- **Actions:** `fallow`, `wheat`, `soybean_first`, `soybean_second`, `maize`. `obs["action_mask"]` and `env.action_masks()` give the ones allowed now. An action outside the mask sows nothing and is flagged in `info`.
- **Observation:** soil water and surface dryness as fractions, the El Niño index known at that decision, which decision it is, this campaign's winter choice, the previous itinerary, campaigns remaining, and the field itself (soil capacity, aridity, latitude, attainable yield per crop). It never contains the year, the coming weather or the coming yields; a test changes only future weather and checks that the observation does not move.
- **Weather:** real campaigns of that field. `weather_sampling="block"` replays consecutive campaigns from a random start year; `"iid"` draws them independently.
- **Reward:** a weighted sum of the outcome components in `info["components"]`: `margin_usd_ha`, `deficit_mm`, `bare_days`, `bare_rain_mm`, `drainage_mm`. The default is margin only. Set `reward_weights` to change it.
- **Splits:** `train` is campaigns 1984/85 to 2012/13, `test` is 2013/14 to 2024/25. Yield anchors and field descriptors only use the training campaigns.

To replay a fixed rotation without an agent, use `rotation_sim.simulate_rotation`.

## Limits

- **It tells good years from bad ones better than it predicts levels.** `scripts/validate.py` correlates simulated and reported yield anomalies per field. On the test campaigns it gives 0.84 to 0.90 for soybean and maize in Pergamino and Paraná, and about zero or negative for maize in Charata, Quimilí and Las Lajitas. Wheat is the weakest crop. Do not use it where that number is low.
- **Yield levels are too low for recent campaigns**, because the attainable yield is fixed at a 1984 to 2012 percentile and ignores the technology trend.
- **Excess water is not modelled.** `drainage_mm` is water above the soil's capacity, not flooding or waterlogging, which is the main risk of an El Niño year.
- **Scale.** The weather is a 55 km cell and the yields are department averages. Only the soil value is local. In Río Cuarto, NASA POWER shows a near-normal 2022/23 and the simulator misses the drought that halved the department's soybean yield.
- **The El Niño value at the end of August includes September.** The team uses July to September, which NOAA publishes in early October. Pass `august_season="MJJ"` for the value that was strictly published. The NOAA file also holds revised values, not the ones issued at the time.
- **Margins are a scenario:** international prices and assumed costs, not farm-gate prices.
- **The episode ends after the last campaign,** so an agent has no reason to leave water in the soil at the end. Check `info["water_mm"]` before reading too much into the last decision.
- Sowing dates outside 30° to 35° S, rooting depth and soil evaporation constants are assumptions, flagged as such in the tables.

## Layout

```
configs/      parameter, crop, calendar and seed-field tables
scripts/      prepare_data.py, replay.py, validate.py
src/rotation_sim/
  eto.py            reference evapotranspiration (FAO-56 Penman-Monteith)
  weather.py        NASA POWER loading and validation, campaigns
  water_balance.py  the daily soil water balance
  crops.py          crops, calendar, daily crop-coefficient schedule
  campaign.py       one campaign in two decisions, rotations
  env.py            the Gymnasium environment
tests/        invariants, FAO-56 worked examples, parity with the lab
data/         downloaded and derived files, not in git
```

## AI use

Scaffolded and written with Claude Fable 5.2 (Anthropic) in Claude Code: the port of the water-balance engine from the team's research lab, the Gymnasium environment, the data preparation scripts, the tests and this README. The engine's equations and parameters come from the lab and its cited sources; the AI-written port is checked against the lab's stored results and against the worked examples of FAO-56.
