#!/usr/bin/env bash
set -euo pipefail

repository=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$repository"
compose=(docker compose -f compose.prod.yml)

# Docker copies source directories, including untracked migrations and application files.
if ! git diff --quiet || ! git diff --cached --quiet || [[ -n "$(git ls-files --others --exclude-standard)" ]]; then
  printf '%s\n' 'Deployment refused: resolve tracked changes and non-ignored untracked files in the checkout first.' >&2
  exit 1
fi

# Quiet validation avoids printing interpolated production secrets into terminal/CI logs.
"${compose[@]}" config --quiet
scripts/deploy/prepare-strategies.sh "$@"
"${compose[@]}" build

# Exercise the immutable mounts as the actual unprivileged image user before replacing
# running services. This only reads precomputed results; no database or model runtime.
"${compose[@]}" run --rm --no-deps backend python -m app.modules.water.cli strategies-verify
"${compose[@]}" up -d --wait --wait-timeout 180

public_origin=$("${compose[@]}" exec -T backend python -c \
  'from app.core.config import get_settings; print(get_settings().better_auth_url)')
python3 scripts/deploy/smoke.py --base-url "$public_origin"
"${compose[@]}" ps
