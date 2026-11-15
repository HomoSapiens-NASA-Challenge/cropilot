"""Crop-rotation simulator and Gymnasium environment driven by NASA POWER weather.

Every output is a simulated scenario, not an agronomic recommendation.
"""

from gymnasium.envs.registration import register

from .campaign import (
    COMPONENT_PROVENANCE,
    COMPONENTS,
    Campaign,
    CampaignOutcome,
    Model,
    simulate_campaign,
    simulate_rotation,
)
from .dataset import TEST_YEARS, TRAIN_YEARS, Dataset, load_dataset
from .env import FALLOW, RotationEnv, make_env
from .fields import Field
from .oni import Oni

__all__ = [
    "COMPONENTS",
    "COMPONENT_PROVENANCE",
    "FALLOW",
    "TEST_YEARS",
    "TRAIN_YEARS",
    "Campaign",
    "CampaignOutcome",
    "Dataset",
    "Field",
    "Model",
    "Oni",
    "RotationEnv",
    "load_dataset",
    "make_env",
    "simulate_campaign",
    "simulate_rotation",
]

register(id="RotationSim-v0", entry_point="rotation_sim.env:make_env")
