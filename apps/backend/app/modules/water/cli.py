"""Install, verify and run the frozen water models without starting the application."""

import argparse
import json
import subprocess
import sys
from pathlib import Path

from app.modules.water.assets import RESOURCES, ArtifactError, prepare_models, verify_installation
from app.modules.water.moisture import predict_moisture, prepare_moisture, verify_moisture
from app.modules.water.service import compare_water_scenarios, predict_regional, read_json_object
from app.modules.water.strategies import (
    build_strategies,
    load_strategies,
    load_strategy_run,
    prepare_strategies,
    verify_strategies,
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    strategies_setup = commands.add_parser("strategies-setup", help="Install Pergamino scenarios")
    strategies_setup.add_argument("--archive", type=Path)
    commands.add_parser("strategies-verify", help="Verify the Pergamino result release")
    strategies = commands.add_parser("strategies", help="Read comparison or one daily scenario")
    strategies.add_argument("--run-id")
    strategies_build = commands.add_parser("strategies-build", help="Reproduce all water scenarios")
    strategies_build.add_argument("--output", type=Path, required=True)
    strategies_build.add_argument("--source-archive", type=Path)
    setup = commands.add_parser("setup", help="Download verified assets and prepare Python 3.12.7")
    setup.add_argument("--archive", type=Path, help="Use a previously downloaded release archive")
    commands.add_parser("verify", help="Check all payload hashes, Python and pinned packages")
    moisture_setup = commands.add_parser("moisture-setup", help="Install the new wetness models")
    moisture_setup.add_argument("--archive", type=Path)
    commands.add_parser("moisture-verify", help="Verify the wetness release and runtime")
    moisture = commands.add_parser("moisture", help="Run 7/14-day historical wetness inference")
    moisture.add_argument(
        "--request", type=Path, default=RESOURCES / "moisture-request.example.json"
    )
    regional = commands.add_parser("regional", help="Run regional climate inference")
    regional.add_argument("--request", type=Path, default=RESOURCES / "request.example.json")
    water = commands.add_parser("water", help="Export the historical rotation comparison")
    water.add_argument("--config", type=Path)
    water.add_argument("--output-parent", type=Path)
    args = parser.parse_args()
    try:
        if args.command == "strategies-build":
            build_strategies(args.output, args.source_archive)
            result = {"status": "research_only", "output_directory": str(args.output.resolve())}
        elif args.command == "strategies-setup":
            prepare_strategies(args.archive)
            result = {"status": "verified", "command": args.command}
        elif args.command == "strategies-verify":
            verify_strategies()
            result = {"status": "verified", "command": args.command}
        elif args.command == "strategies":
            value = load_strategy_run(args.run_id) if args.run_id else load_strategies()
            result = value.model_dump(mode="json")
        elif args.command == "setup":
            prepare_models(args.archive)
            result = {"status": "verified", "command": "setup"}
        elif args.command == "verify":
            verify_installation()
            result = {"status": "verified", "command": "verify"}
        elif args.command == "regional":
            result = predict_regional(read_json_object(args.request))
        elif args.command == "moisture-setup":
            prepare_moisture(args.archive)
            result = {"status": "verified", "command": "moisture-setup"}
        elif args.command == "moisture-verify":
            verify_moisture()
            result = {"status": "verified", "command": "moisture-verify"}
        elif args.command == "moisture":
            result = predict_moisture(read_json_object(args.request))
        else:
            comparison = compare_water_scenarios(
                read_json_object(args.config) if args.config else None,
                output_parent=args.output_parent,
            )
            result = {
                "output_directory": str(comparison.output_directory),
                "manifest": str(comparison.output_directory / "comparison.json"),
                "status": "research_only",
            }
        sys.stdout.write(json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False) + "\n")
        return 0
    except (ArtifactError, KeyError, ValueError, OSError, subprocess.SubprocessError) as error:
        detail = error.stderr if isinstance(error, subprocess.CalledProcessError) else str(error)
        sys.stderr.write(f"Water models: {detail}\n")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
