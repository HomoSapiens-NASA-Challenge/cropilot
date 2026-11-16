# Rotation planner

The planner answers one question for the region of the user's workspace: given how much each outcome matters, which winter and summer crops should be chosen each campaign, and does that beat the best fixed rotation? Every output is a **simulated scenario, not an agronomic recommendation**; it supports the agronomist's judgment.

Each run is computed live from the team's rotation simulator (`apps/backend/vendor/rotation-sim`), with no cached results and no artificial delay. The verdict is computed, never written down in advance.

## What a run does

1. **Simulate.** For every training campaign (1984/85-2012/13), every itinerary the region allows and 11 soil water levels (0 to 100 % of capacity), run the simulator. One batched call covers the 11 levels, so a run simulates years x itineraries x 11 campaign-states.
2. **Build the decision process** (a tabular MDP, `mdp.py`) from those results.
3. **Solve** it exactly by backward induction. Two more processes on the same kernel are solved for baselines: the one-campaign horizon (when the horizon is above 1) and the margin-only weights (when the priorities are not already margin only). The stage counts the states of every process it solves.
4. **Train** five tabular Q-learning agents, one after another, each from its own random seed (30,000 x horizon episodes each). At 40 checkpoints per agent, report its **exact** policy value and the share of decision states where its greedy action is optimal. Nothing is estimated from noisy returns. The first agent is the one reported as "agent"; the other four show that reaching the optimum does not hinge on one seed.
5. **Score fixed rotations**: every repeating cycle of 1 to 3 campaigns, and the region's named strategies from the demo case.
6. **Backtest**: replay every policy through the real simulator on 1984-2012 (train) and 2013/14-2024/25 (held out), as one continuous chain per split, then compare the optimum with every other policy on the held-out campaigns (see below).

## The decision process

- **June state** `(k, water, ENSO phase of February-April)`: choose wheat or fallow. `k` is the number of campaigns already done, up to the horizon (1 to 5).
- **August state** `(k, water, winter, ENSO phase of July-September)`: choose the summer crop, completing the itinerary.
- **Transitions.** A June choice draws a training campaign among those with the same June phase and so reveals the August phase. The August choice draws a training campaign among those with that August phase, pays its score for (itinerary, water) and moves to its end-of-campaign water. The next June phase is drawn from the frequency of June phases over all training campaigns.
- **Score** of a campaign: `sum(weight x sign x outcome / scale)`. Weights are normalised to sum 1. Margin counts up; water deficit, bare-soil days, rain on bare soil and drainage count down. The scale is each outcome's standard deviation over the training kernel, so scores are unitless; outcomes are always shown in their own units beside them. No discounting; the value after the last campaign is 0.
- **Fixed rotations** are valued exactly, as open-loop plans over the horizon. Each cycle is entered at the campaign that suits it best, chosen on training campaigns only. The verdict compares the optimal policy with the best of them.
- **Backtest of adaptive policies** re-plans every June with its first-campaign table (receding horizon). Fixed ones cycle their sequence from the first campaign.

## Policies and the held-out comparison

The result lists policies in this order; clients find one by `policy_id` or `kind`, never by position.

- `optimal`: the exact optimum for the user's weights and horizon.
- `agent`: the first Q-learning agent.
- `myopic`, "One campaign at a time (greedy)", only when the horizon is above 1: the exact optimum of the same process with a one-campaign horizon (same kernel and weights), applied again at every campaign. It reads soil water and El Niño phase like the optimum and differs only in ignoring the campaigns after the next one. Its expected score is evaluated on the user's process by repeating its one-campaign tables across the horizon. At horizon 1 it equals the optimum and is left out.
- `best_fixed`: the best repeating cycle on training campaigns.
- `margin_only`, "Margin only", only when the weights are not already margin only: the exact optimum of the same horizon with all weight on gross margin. It is replayed and scored (expected, train, held-out) with the **user's** weights, so its differences from the optimum are comparable and show what the other priorities change.
- `named`: the region's case strategies.

`verdict.held_out` has one entry per policy other than `optimal`, in that order. Each is the optimum minus the baseline, paired campaign by campaign over the 12 held-out campaigns:

- the mean score difference, the campaigns won (strictly higher score), the difference of mean outcomes in their own units, and the difference of bad-year margin;
- **interval:** the 12 campaigns are cut into 4 consecutive blocks of 3. The mean difference is recomputed for every ordered resample of 4 blocks with replacement (4^4 = 256, no random draws), and the interval is the 2.5th to 97.5th percentile of those means. `bootstrap` in the result states the confidence, block size, blocks and resamples, computed from the split length;
- **conclusion:** `identical` when the two policies differ by less than 1e-9 on every campaign (they played the same crops), `better` when the whole interval is above 0, `worse` when it is below 0, otherwise `inconclusive`.

**Bad-year margin** is the mean gross margin of the worst `ceil(n / 5)` campaigns of a split: 3 of 12 held-out campaigns, 6 of 29 training campaigns. It is a plain lower-tail mean, not a CVaR.

The training campaigns of each June phase followed by each August phase are reported as `enso_transitions`, all nine pairs with zeros included, so a client can say how often each August phase followed a given June phase.

The held-out split, the paired block resample and the greedy baseline follow the protocol of the team's earlier RL research. The planner reimplements them on the live simulator and shows none of that research's numbers.

## Region setup

`GET /api/rotation-plans/setup` describes the workspace region before any run, without simulating a campaign: soil water capacity, the 11 water levels, the simulator's declared starting soil water (an assumption, not a measurement), the itineraries the simulator can play, the case strategies it cannot (with the reason), the sources, and the latest NOAA readings. The latest readings are the newest campaign after the held-out ones with a published February-April ONI, and its July-September value if published; a missing one is null. Both phases use the same +-0.5 rule as the decision process. With the NOAA file installed on 2026-11-15 they are Feb-Apr 2026 +0.11 (neutral) and Jul-Sep 2026 +2.16 (El Niño).

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

This copies `fields.json`, the NASA POWER weather and the ONI file into `apps/backend/data/rotation-sim`. Without it, `POST /api/rotation-plans` and `GET /api/rotation-plans/setup` answer 503.

## Limits

- It inherits the simulator's limits: weather is a 55 km NASA POWER cell, yields are department statistics, nitrogen, residues and diseases are not modelled, excess water is not modelled, prices are international benchmarks and costs are assumptions. Do not use a region where the simulator tracks reported yield anomalies poorly.
- Cover crops are not modelled. Second soybean is only available where MAGyP has a usable record. Strategies that need either are listed as unavailable with the reason.
- ENSO is the only signal the policy reads besides soil water. Many regions show little gain over a good fixed rotation; the verdict reports exactly that.
- Training campaigns are 29. A policy chosen on them can lose on the held-out campaigns, and the planner shows when it does.
- The held-out interval rests on 4 blocks, which is coarse: "better" needs nearly every block to agree. The campaigns are one continuous chain (soil water carries over), so blocks are not independent restarts. The interval describes these 12 campaigns, not future ones.
- Runs live in the memory of one API process; a restart drops them.
