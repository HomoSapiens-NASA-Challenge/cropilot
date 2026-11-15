# Rotation planner

The planner answers one question for the region of the user's workspace: given how much each outcome matters, which winter and summer crops should be chosen each campaign, and does that beat the best fixed rotation? Every output is a **simulated scenario, not an agronomic recommendation**; it supports the agronomist's judgment.

Each run is computed live from the team's rotation simulator (`apps/backend/vendor/rotation-sim`), with no cached results and no artificial delay. The verdict is computed, never written down in advance.

## What a run does

1. **Simulate.** For every training campaign (1984/85-2012/13), every itinerary the region allows and 11 soil water levels (0 to 100 % of capacity), run the simulator. One batched call covers the 11 levels, so a run simulates years x itineraries x 11 campaign-states.
2. **Build the decision process** (a tabular MDP, `mdp.py`) from those results.
3. **Solve** it exactly by backward induction.
4. **Train** five tabular Q-learning agents, one after another, each from its own random seed (30,000 x horizon episodes each). At 40 checkpoints per agent, report its **exact** policy value and the share of decision states where its greedy action is optimal. Nothing is estimated from noisy returns. The first agent is the one reported as "agent"; the other four show that reaching the optimum does not hinge on one seed.
5. **Score fixed rotations**: every repeating cycle of 1 to 3 campaigns, and the region's named strategies from the demo case.
6. **Backtest**: replay every policy through the real simulator on 1984-2012 (train) and 2013/14-2024/25 (held out), as one continuous chain per split.

## The decision process

- **June state** `(k, water, ENSO phase of February-April)`: choose wheat or fallow. `k` is the number of campaigns already done, up to the horizon (1 to 5).
- **August state** `(k, water, winter, ENSO phase of July-September)`: choose the summer crop, completing the itinerary.
- **Transitions.** A June choice draws a training campaign among those with the same June phase and so reveals the August phase. The August choice draws a training campaign among those with that August phase, pays its score for (itinerary, water) and moves to its end-of-campaign water. The next June phase is drawn from the frequency of June phases over all training campaigns.
- **Score** of a campaign: `sum(weight x sign x outcome / scale)`. Weights are normalised to sum 1. Margin counts up; water deficit, bare-soil days, rain on bare soil and drainage count down. The scale is each outcome's standard deviation over the training kernel, so scores are unitless; outcomes are always shown in their own units beside them. No discounting; the value after the last campaign is 0.
- **Fixed rotations** are valued exactly, as open-loop plans over the horizon. Each cycle is entered at the campaign that suits it best, chosen on training campaigns only. The verdict compares the optimal policy with the best of them.
- **Backtest of adaptive policies** re-plans every June with its first-campaign table (receding horizon). Fixed ones cycle their sequence from the first campaign.

## Assumptions

- The August decision does **not** see the soil water of August: the state keeps the water of the start of the campaign.
- The campaign year is drawn within an ENSO phase and redrawn at August, so the process stays Markov. This forgets which June year revealed the August phase.
- ENSO phases come from NOAA's ONI: La Niña at or below -0.5, El Niño at or above +0.5, otherwise neutral. A phase with no training campaign would fall back to all of them; with the NOAA record every phase has some, and each decision cell reports its count.
- The surface evaporation store restarts at the simulator's declared value in every kernel call, so the model carries only soil water between campaigns. The backtest replays carry both, as the simulator does.
- **Start distribution:** the simulator's declared `initial_water_fraction` (0.5, level 5 of 11), used for every expected score and the backtests. The agent trains from random start levels so it sees every state.
- Water is rounded to the nearest of 11 levels between campaigns.
- Agreement counts decision states the learner can reach that offer a real choice.

## Install the inputs

The simulator data is not in git. From a simulator checkout with prepared data:

```sh
scripts/rotation_sim/install.sh ../simulator
```

This copies `fields.json`, the NASA POWER weather and the ONI file into `apps/backend/data/rotation-sim`. Without it, `POST /api/rotation-plans` answers 503.

## Limits

- It inherits the simulator's limits: weather is a 55 km NASA POWER cell, yields are department statistics, nitrogen, residues and diseases are not modelled, excess water is not modelled, prices are international benchmarks and costs are assumptions. Do not use a region where the simulator tracks reported yield anomalies poorly.
- Cover crops are not modelled. Second soybean is only available where MAGyP has a usable record. Strategies that need either are listed as unavailable with the reason.
- ENSO is the only signal the policy reads besides soil water. Many regions show little gain over a good fixed rotation; the verdict reports exactly that.
- Training campaigns are 29. A policy chosen on them can lose on the held-out campaigns, and the planner shows when it does.
- Runs live in the memory of one API process; a restart drops them.
