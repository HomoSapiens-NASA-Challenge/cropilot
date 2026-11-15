"""Gymnasium environment: plan the rotation of a field, two decisions per campaign.

Each episode is one field over ``horizon_campaigns`` consecutive campaigns. Every campaign has
two steps:

1. June 1: sow a winter crop or stay fallow;
2. end of August: choose the summer crop, seeing the soil water after the winter months and
   the El Niño index of that moment.

The weather that follows a decision is a real historical campaign of that field. The
observation only holds what is known when deciding: the simulated soil state, the El Niño
index already published, the field's own description and the rotation so far. It never holds
the year, the coming weather or the coming yields.

The field changes between episodes, so one policy has to work across soils and climates: the
field's soil capacity, aridity, latitude and attainable yields are part of the observation.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any

import gymnasium as gym
import numpy as np
from gymnasium import spaces

from .campaign import COMPONENT_PROVENANCE, COMPONENTS, CONFIG_DIR, Campaign, Model
from .dataset import DATA_DIR, TEST_YEARS, TRAIN_YEARS, load_dataset
from .fields import Field
from .oni import AUGUST_SEASON, JUNE_SEASON, Oni
from .weather import CampaignWeather, campaign_label

FALLOW = "fallow"
JUNE, AUGUST = 0, 1
DECISIONS = ("june", "august")

# Fixed scales that bring the field description to order one. They are units, not statistics.
TAW_SCALE_MM = 100.0
ANCHOR_SCALE_KG_HA = 10_000.0
FIELD_FEATURE_MAX = 10.0
ONI_BOUND = 5.0

# The scalar reward is a weighted sum of the outcome components. The default follows the
# lab's primary profile: margin only, in hundreds of USD per hectare. Margin is a scenario
# (international prices, assumed costs), not a farm profit forecast.
DEFAULT_REWARD_WEIGHTS = {"margin_usd_ha": 0.01}


class RotationEnv(gym.Env):
    metadata = {"render_modes": []}  # noqa: RUF012

    def __init__(
        self,
        model: Model,
        fields: Sequence[Field],
        weather: Mapping[str, Mapping[int, CampaignWeather]],
        oni: Oni,
        *,
        years: Sequence[int],
        horizon_campaigns: int = 3,
        weather_sampling: str = "block",
        random_initial_water: bool = True,
        reward_weights: Mapping[str, float] | None = None,
        invalid_action: str = "fallow",
        june_season: str = JUNE_SEASON,
        august_season: str = AUGUST_SEASON,
    ) -> None:
        """
        years: campaign start years the episodes may draw from (the train or test split).
        weather_sampling: "block" replays consecutive real campaigns from a random start year,
            keeping real multi-year sequences; "iid" draws each campaign independently, which
            gives more variety but assumes campaigns are independent.
        random_initial_water: start each episode at a uniformly random soil water, otherwise at
            the assumed fraction of capacity from the parameter table.
        invalid_action: what to do with an action outside the mask. "fallow" sows nothing and
            flags it in ``info`` (agents that explore without masking stay usable); "raise"
            stops with an error (for evaluation code, where it is always a bug).
        """
        if weather_sampling not in ("block", "iid"):
            raise ValueError("weather_sampling must be 'block' or 'iid'")
        if invalid_action not in ("raise", "fallow"):
            raise ValueError("invalid_action must be 'raise' or 'fallow'")
        if horizon_campaigns < 1:
            raise ValueError("horizon_campaigns must be at least 1")
        if not fields:
            raise ValueError("At least one field is required")
        self.model = model
        self.fields = {f.field_id: f for f in fields}
        if len(self.fields) != len(fields):
            raise ValueError("Duplicate field_id")
        self.weather = weather
        self.oni = oni
        self.years = tuple(sorted(set(years)))
        self.horizon = horizon_campaigns
        self.weather_sampling = weather_sampling
        self.random_initial_water = random_initial_water
        self.invalid_action = invalid_action
        self.seasons = (june_season, august_season)
        weights = DEFAULT_REWARD_WEIGHTS if reward_weights is None else reward_weights
        unknown = set(weights) - set(COMPONENTS)
        if unknown:
            raise ValueError(f"Unknown reward components: {sorted(unknown)}")
        self.reward_weights = np.array([weights.get(name, 0.0) for name in COMPONENTS])

        self.actions = (FALLOW, *model.crops)
        n_actions = len(self.actions)
        self._field_ids = tuple(self.fields)
        self._features = {f.field_id: self._field_features(f) for f in fields}
        self._starts: dict[str, tuple[int, ...]] = {}
        for f in fields:
            self._check_field(f)

        self.action_space = spaces.Discrete(n_actions)
        self.observation_space = spaces.Dict(
            {
                "water_fraction": spaces.Box(0.0, 1.0, shape=(1,), dtype=np.float32),
                "surface_depletion_fraction": spaces.Box(0.0, 1.0, shape=(1,), dtype=np.float32),
                "oni": spaces.Box(-ONI_BOUND, ONI_BOUND, shape=(1,), dtype=np.float32),
                "decision": spaces.Discrete(2),
                "winter_choice": spaces.Discrete(n_actions),
                "previous_itinerary": spaces.MultiDiscrete([n_actions + 1, n_actions + 1]),
                "campaigns_remaining": spaces.Discrete(self.horizon + 1),
                "field": spaces.Box(
                    np.array([0.0, 0.0, -1.0] + [0.0] * len(model.crops), dtype=np.float32),
                    np.array(
                        [FIELD_FEATURE_MAX, FIELD_FEATURE_MAX, 1.0]
                        + [FIELD_FEATURE_MAX] * len(model.crops),
                        dtype=np.float32,
                    ),
                    dtype=np.float32,
                ),
                "action_mask": spaces.MultiBinary(n_actions),
            }
        )
        self._campaign: Campaign | None = None
        self._field: Field | None = None

    # ------------------------------------------------------------------ setup

    def _field_features(self, f: Field) -> np.ndarray:
        """[soil capacity, aridity, latitude, attainable yield per crop (0 if unavailable)]."""
        anchors = [
            f.yield_anchor_kg_ha[c] / ANCHOR_SCALE_KG_HA if self.model.available(f, c) else 0.0
            for c in self.model.crops
        ]
        features = np.array(
            [f.taw_mm / TAW_SCALE_MM, f.aridity_index, f.latitude_deg / 90.0, *anchors],
            dtype=np.float32,
        )
        if not np.isfinite(features).all() or features.max() > FIELD_FEATURE_MAX:
            raise ValueError(f"Field {f.field_id} has features outside the observation bounds")
        return features

    def _check_field(self, f: Field) -> None:
        if f.field_id not in self.weather:
            raise ValueError(f"No weather for field {f.field_id}")
        if not any(self.model.available(f, c) for c in self.model.crops):
            raise ValueError(f"Field {f.field_id} has no crop with a calendar and a yield anchor")
        usable = [y for y in self.years if y in self.weather[f.field_id]]
        if self.weather_sampling == "iid":
            starts = tuple(usable)
        else:
            starts = tuple(
                y for y in usable if all(y + k in usable for k in range(1, self.horizon))
            )
        if not starts:
            raise ValueError(
                f"Field {f.field_id} has no run of {self.horizon} consecutive campaigns in the "
                "requested years"
            )
        self._starts[f.field_id] = starts
        for year in usable:
            for season in self.seasons:
                if abs(self.oni.anomaly(season, year)) > ONI_BOUND:
                    raise ValueError(f"ONI {season} {year} outside the observation bounds")

    # --------------------------------------------------------------- episode

    def reset(
        self, *, seed: int | None = None, options: dict[str, Any] | None = None
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        """Options: ``field_id``, ``start_year`` (replays consecutive campaigns from that
        year, whatever the sampling mode) and ``initial_water_fraction`` in [0, 1]."""
        super().reset(seed=seed)
        options = options or {}
        unknown = set(options) - {"field_id", "start_year", "initial_water_fraction"}
        if unknown:
            raise ValueError(f"Unknown reset options: {sorted(unknown)}")

        field_id = options.get("field_id")
        if field_id is None:
            field_id = self._field_ids[int(self.np_random.integers(len(self._field_ids)))]
        elif field_id not in self.fields:
            raise ValueError(f"Unknown field_id {field_id!r}")
        self._field = self.fields[field_id]

        starts = self._starts[field_id]
        start_year = options.get("start_year")
        if start_year is not None:
            years = [int(start_year) + k for k in range(self.horizon)]
            missing = [y for y in years if y not in self.weather[field_id]]
            if missing:
                raise ValueError(f"No complete weather for campaigns starting in {missing}")
        elif self.weather_sampling == "block":
            first = starts[int(self.np_random.integers(len(starts)))]
            years = [first + k for k in range(self.horizon)]
        else:
            years = [
                starts[int(i)] for i in self.np_random.integers(len(starts), size=self.horizon)
            ]
        self._years = years

        fraction = options.get("initial_water_fraction")
        if fraction is None:
            fraction = (
                float(self.np_random.uniform())
                if self.random_initial_water
                else self.model.initial_water_fraction
            )
        if not 0.0 <= fraction <= 1.0:
            raise ValueError("initial_water_fraction must be within [0, 1]")

        self._index = 0
        self._previous = (len(self.actions), len(self.actions))  # no itinerary yet
        self._begin_campaign(fraction * self._field.taw_mm, self.model.initial_surface_depletion_mm)
        return self._observation(), self._info()

    def _begin_campaign(self, water_mm: float, surface_depletion_mm: float) -> None:
        assert self._field is not None
        year = self._years[self._index]
        self._campaign = Campaign(
            self.model,
            self._field,
            self.weather[self._field.field_id][year],
            water_mm,
            surface_depletion_mm,
        )
        self._decision = JUNE
        self._winter_choice = 0

    def step(self, action: int) -> tuple[dict[str, Any], float, bool, bool, dict[str, Any]]:
        """Take one decision. ``info`` describes the decision just taken and what it produced;
        the returned observation is the next decision to take."""
        if self._campaign is None or self._index >= self.horizon:
            raise RuntimeError("The episode is over or was never started: call reset()")
        action = int(action)
        if not 0 <= action < len(self.actions):
            raise ValueError(f"Action {action} is outside the action space")
        invalid = not self._mask()[action]
        if invalid:
            if self.invalid_action == "raise":
                allowed = [self.actions[i] for i in np.flatnonzero(self._mask())]
                raise ValueError(
                    f"{self.actions[action]!r} is not allowed at the {DECISIONS[self._decision]} "
                    f"decision of this field; allowed: {allowed}"
                )
            action = 0
        crop = None if action == 0 else self.actions[action]
        campaign = self._campaign
        info = self._info()
        info["action"] = self.actions[action]
        info["invalid_action"] = invalid

        if self._decision == JUNE:
            increments = campaign.decide_winter(crop)
            self._winter_choice = action
            self._decision = AUGUST
        else:
            increments = campaign.decide_summer(crop)
            outcome = campaign.outcome()
            info["itinerary"] = (outcome.winter or FALLOW, outcome.summer or FALLOW)
            info["yield_kg_ha"] = {k: float(v) for k, v in outcome.yield_kg_ha.items()}
            info["relative_yield"] = {k: float(v) for k, v in outcome.relative_yield.items()}
            info["campaign_components"] = {k: float(v) for k, v in outcome.components.items()}
            self._previous = (self._winter_choice, action)
            self._index += 1
            if self._index < self.horizon:
                self._begin_campaign(float(campaign.water_mm), float(campaign.surface_depletion_mm))

        components = np.array([float(increments[name]) for name in COMPONENTS])
        info["components"] = dict(zip(COMPONENTS, components.tolist(), strict=True))
        info["water_mm"] = float(campaign.water_mm)
        reward = float(self.reward_weights @ components)
        # The horizon is part of the observation, so the last campaign is a true terminal state.
        terminated = self._index >= self.horizon
        return self._observation(), reward, terminated, False, info

    # ----------------------------------------------------------- observation

    def _mask(self) -> np.ndarray:
        mask = np.zeros(len(self.actions), dtype=np.int8)
        if self._campaign is None or self._field is None or self._index >= self.horizon:
            return mask
        mask[0] = 1
        if self._decision == JUNE:
            options = self.model.winter_options(self._field)
        else:
            winter = None if self._winter_choice == 0 else self.actions[self._winter_choice]
            options = self.model.summer_options(self._field, winter)
        for crop_id in options:
            mask[self.actions.index(crop_id)] = 1
        return mask

    def action_masks(self) -> np.ndarray:
        """Boolean mask of the actions allowed now (the convention of maskable agents)."""
        return self._mask().astype(bool)

    def _observation(self) -> dict[str, Any]:
        assert self._campaign is not None and self._field is not None
        campaign, f = self._campaign, self._field
        finished = self._index >= self.horizon
        if finished:
            # Nothing is decided after the last campaign: no index value and an empty mask.
            oni = 0.0
        else:
            oni = self.oni.anomaly(self.seasons[self._decision], campaign.weather.year)
        water = float(np.clip(campaign.water_mm / f.taw_mm, 0.0, 1.0))
        surface = float(np.clip(campaign.surface_depletion_mm / self.model.soil.tew_mm, 0.0, 1.0))
        return {
            "water_fraction": np.array([water], dtype=np.float32),
            "surface_depletion_fraction": np.array([surface], dtype=np.float32),
            "oni": np.array([oni], dtype=np.float32),
            "decision": JUNE if finished else self._decision,
            "winter_choice": 0 if finished else self._winter_choice,
            "previous_itinerary": np.array(self._previous, dtype=np.int64),
            "campaigns_remaining": self.horizon - self._index,
            "field": self._features[f.field_id].copy(),
            "action_mask": self._mask(),
        }

    def _info(self) -> dict[str, Any]:
        """Bookkeeping for logs and plots. It names the campaign, so never feed it to an agent."""
        assert self._campaign is not None and self._field is not None
        year = self._campaign.weather.year
        return {
            "field_id": self._field.field_id,
            "campaign_year": year,
            "campaign": campaign_label(year),
            "decision": DECISIONS[self._decision],
            "provenance": dict(COMPONENT_PROVENANCE),
        }


def make_env(
    data_dir: str | Path = DATA_DIR,
    split: str = "train",
    config_dir: str | Path = CONFIG_DIR,
    **kwargs: Any,
) -> RotationEnv:
    """Environment over the prepared data. ``split`` is "train", "test" or "all" campaigns."""
    splits = {"train": TRAIN_YEARS, "test": TEST_YEARS, "all": TRAIN_YEARS + TEST_YEARS}
    if split not in splits:
        raise ValueError(f"split must be one of {sorted(splits)}")
    dataset = load_dataset(data_dir, config_dir)
    return RotationEnv(
        dataset.model, dataset.fields, dataset.weather, dataset.oni, years=splits[split], **kwargs
    )
