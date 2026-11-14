"""Package an evaluated run without adding model weights or daily data to Git."""

import argparse
import hashlib
import json
import shutil
import tarfile
from pathlib import Path


def checksum(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def package(training: Path, output: Path) -> None:
    backend = Path(__file__).resolve().parents[1]
    resources = backend / "app/modules/water/resources"
    source = Path(__file__).with_name("moisture.py")
    metrics = json.loads((training / "metrics.json").read_text())
    if metrics["source_code_sha256"] != checksum(source):
        raise ValueError("Runtime source changed after training")
    if output.exists():
        raise ValueError("Use a new output directory")
    output.mkdir(parents=True)
    files = {
        "models/moisture-v1.joblib": training / "moisture-v1.joblib",
        "models/runtime/moisture.py": source,
        "data/predictions-7d.csv": training / "predictions-7d.csv",
        "data/predictions-14d.csv": training / "predictions-14d.csv",
    }
    asset = "cropilot-moisture-models-v1.tar.gz"
    archive = output / asset
    with tarfile.open(archive, "w:gz") as handle:
        for name, path in files.items():
            handle.add(path, arcname=name, recursive=False)
    release = {
        "repository": "HomoSapiens-NASA-Challenge/cropilot",
        "tag": "models-moisture-v1",
        "asset": asset,
        "archive_sha256": checksum(archive),
        "python_version": "3.12.7",
        "status": "research_only",
        "requires_release": "models-water-v1",
        "files": {
            name: {"sha256": checksum(path), "size": path.stat().st_size}
            for name, path in files.items()
        },
    }
    (resources / "moisture-release.json").write_text(json.dumps(release, indent=2) + "\n")
    for name in ("metrics.json", "request.example.json", "response.example.json"):
        shutil.copyfile(training / name, resources / ("moisture-" + name))
    figure = backend.parents[1] / "docs/assets/moisture-comparison.png"
    figure.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(training / "comparison.png", figure)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("training", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    package(args.training, args.output)
