"""Statistics for the held-out comparison: a paired block resample and the lower tail.

Pure numpy; no random draws, so the same run always reports the same interval.
"""

from itertools import product

import numpy as np

from app.modules.rotation_planner.mdp import FloatArray

CONFIDENCE = 0.95
# The held-out campaigns are consecutive years of one chain, so they are resampled in blocks.
BLOCK_CAMPAIGNS = 3
# The bad-year margin is the mean of the worst fifth of campaigns.
LOWER_TAIL_SHARE = 5


def n_blocks(n_campaigns: int, block_campaigns: int = BLOCK_CAMPAIGNS) -> int:
    """How many whole blocks the campaigns split into."""
    if block_campaigns < 1 or n_campaigns < 1 or n_campaigns % block_campaigns:
        raise ValueError(f"{n_campaigns} campaigns do not split into blocks of {block_campaigns}")
    return n_campaigns // block_campaigns


def block_interval(
    differences: FloatArray, block_campaigns: int = BLOCK_CAMPAIGNS
) -> tuple[float, float]:
    """Interval of the mean of paired differences from every ordered block resample.

    The campaigns are cut into consecutive blocks of `block_campaigns`. Resampling picks as many
    blocks as there are, with replacement, in every possible order (`blocks ** blocks` resamples);
    the interval holds the central `CONFIDENCE` share of the resampled means.
    """
    blocks = n_blocks(len(differences), block_campaigns)
    block_means = np.asarray(differences, dtype=float).reshape(blocks, block_campaigns).mean(axis=1)
    picks = np.array(list(product(range(blocks), repeat=blocks)), dtype=np.intp)
    resampled = block_means[picks].mean(axis=1)
    tail = 100 * (1 - CONFIDENCE) / 2
    low, high = np.percentile(resampled, [tail, 100 - tail])
    return float(low), float(high)


def lower_tail_mean(values: FloatArray) -> tuple[float, int]:
    """Mean of the worst `ceil(n / 5)` values, and how many that is."""
    count = -(-len(values) // LOWER_TAIL_SHARE)
    if count < 1:
        raise ValueError("The lower tail needs at least one value")
    return float(np.sort(values)[:count].mean()), count
