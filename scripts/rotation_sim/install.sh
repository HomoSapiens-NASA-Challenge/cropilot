#!/usr/bin/env sh
# Copies the rotation simulator's prepared inputs into apps/backend/data/rotation-sim (out of Git).
#
# The simulator code is vendored in apps/backend/vendor/rotation-sim: a byte copy of
# HomoSapiens-NASA-Challenge/simulator at commit 672a222 (pyproject.toml, README.md,
# src/rotation_sim, configs). Refresh it from a simulator checkout with:
#   git -C <simulator> archive <commit> pyproject.toml README.md src/rotation_sim configs \
#     | tar -x -C apps/backend/vendor/rotation-sim
set -eu

simulator=${1:?usage: scripts/rotation_sim/install.sh <simulator checkout with prepared data/>}
root=$(cd "$(dirname "$0")/../.." && pwd)
source_dir="$simulator/data"
target="$root/apps/backend/data/rotation-sim"

if [ ! -f "$source_dir/fields.json" ]; then
  echo "No $source_dir/fields.json. Run 'uv run python scripts/prepare_data.py' in $simulator first." >&2
  exit 1
fi

rm -rf "$target"
mkdir -p "$target/raw"
cp "$source_dir/fields.json" "$target/"
cp -R "$source_dir/raw/power" "$target/raw/"
cp "$source_dir/raw/oni.ascii.txt" "$target/raw/"
echo "Simulator inputs copied to $target"
