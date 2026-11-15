"""Copy only catalog-matched OPERA downloads into the shared data bundle."""

from __future__ import annotations

import argparse
import csv
import logging
import shutil
from pathlib import Path
from urllib.parse import urlparse

from bundle_manifest import sha256_file

DEFAULT_OUTPUT = Path(__file__).resolve().parents[3] / "data/pergamino"
LOGGER = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--source-dir", type=Path, default=Path.home() / "Downloads")
    args = parser.parse_args()
    opera = args.output_dir / "satellite/opera"
    target_dir = opera / "raw"
    target_dir.mkdir(parents=True, exist_ok=True)
    count = 0
    with (opera / "granules.csv").open(encoding="utf-8", newline="") as stream:
        for row in csv.DictReader(stream):
            for key in ("water_url", "confidence_url"):
                if not row[key]:
                    continue
                name = Path(urlparse(row[key]).path).name
                source, target = args.source_dir / name, target_dir / name
                if not source.is_file():
                    continue
                if target.exists():
                    if sha256_file(source) != sha256_file(target):
                        raise ValueError(f"Different contents for existing source artifact: {name}")
                    continue
                shutil.copy2(source, target)
                if sha256_file(source) != sha256_file(target):
                    raise ValueError(f"Copied file failed integrity check: {name}")
                count += 1
                LOGGER.info("Imported %s", name)
    LOGGER.info("Imported %s files; originals preserved in the download folder", count)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    main()
