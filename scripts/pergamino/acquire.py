"""Run the independent Pergamino acquisition components, then inventory their outputs."""

from __future__ import annotations

import argparse
import logging
import subprocess
import sys
from pathlib import Path

LOGGER = logging.getLogger(__name__)
SCRIPTS = Path(__file__).resolve().parent
DEFAULT_OUTPUT = SCRIPTS.parents[2] / "data/pergamino"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--components",
        nargs="+",
        choices=["crop_history", "context_data", "satellite_data", "field_candidates"],
        default=["crop_history", "context_data", "satellite_data", "field_candidates"],
    )
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    failed = []
    for component in args.components:
        LOGGER.info("Running %s", component)
        result = subprocess.run(
            [
                sys.executable,
                str(SCRIPTS / f"{component}.py"),
                "--output-dir",
                str(args.output_dir),
            ],
            check=False,
        )
        if result.returncode:
            failed.append(component)
            LOGGER.error("%s failed; preserving other independently acquired data", component)
    subprocess.run(
        [sys.executable, str(SCRIPTS / "bundle_manifest.py"), "--output-dir", str(args.output_dir)],
        check=True,
    )
    if failed:
        raise SystemExit(f"Acquisition incomplete; failed components: {', '.join(failed)}")


if __name__ == "__main__":
    main()
