#!/usr/bin/env bash
set -euo pipefail

repository=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$repository/apps/backend"
umask 022

# Production bind mounts always use these paths, even if a developer customized .env.
export WATER_MODELS_DIR="$PWD/models/water-v1"
export WATER_DATA_DIR="$PWD/data/water-v1"
export WATER_ENVIRONMENT="$PWD/.venv-models"
unset PYTHONPATH PYTHONHOME

# The existing installer checks the pinned archive and every payload member. GitHub
# authentication stays on the host; --archive supports an offline, pre-downloaded asset.
if [[ $# -eq 0 && ( -e data/strategies-v1 || -e models/strategies-v1 ) ]]; then
  uv run --frozen --no-dev python -m app.modules.water.cli strategies-verify
else
  uv run --frozen --no-dev python -m app.modules.water.cli strategies-setup "$@"
fi
