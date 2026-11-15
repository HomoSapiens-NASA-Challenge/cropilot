"""Package precomputed scenarios; only the integrity manifest belongs in Git."""

import argparse
import hashlib
import io
import json
import tarfile
from pathlib import Path


def package(build: Path, output: Path, resources: Path) -> dict:
    files = {
        "data/" + p.relative_to(build).as_posix(): p
        for p in sorted(build.rglob("*"))
        if p.is_file()
    }
    files["models/runtime/strategies.py"] = Path(__file__).with_name("strategies.py")
    files["models/strategies-config.json"] = resources / "strategies-config.json"
    output.mkdir(parents=True, exist_ok=True)
    archive = output / "cropilot-strategies-v1.tar.gz"
    records = {}
    with tarfile.open(archive, "w:gz") as handle:
        for name, path in sorted(files.items()):
            content = path.read_bytes()
            records[name] = {"size": len(content), "sha256": hashlib.sha256(content).hexdigest()}
            info = tarfile.TarInfo(name)
            info.size = len(content)
            info.mode = 0o644
            handle.addfile(info, io.BytesIO(content))
    manifest = {
        "repository": "HomoSapiens-NASA-Challenge/cropilot",
        "tag": "models-strategies-v1",
        "asset": archive.name,
        "archive_sha256": hashlib.sha256(archive.read_bytes()).hexdigest(),
        "python_version": "3.12.7",
        "files": records,
    }
    (resources / "strategies-release.json").write_text(json.dumps(manifest, indent=2) + "\n")
    (output / (archive.name + ".sha256")).write_text(
        f"{manifest['archive_sha256']}  {archive.name}\n"
    )
    return {"archive": str(archive), "size": archive.stat().st_size, "files": len(files)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--build", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--resources", type=Path, required=True)
    args = parser.parse_args()
    result = package(args.build, args.output, args.resources)
    import sys

    sys.stdout.write(json.dumps(result) + "\n")


if __name__ == "__main__":
    main()
