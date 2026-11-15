"""Read Cropilot evidence with the official SDK; usable by a text or voice orchestrator."""

import argparse
import asyncio
import json
import sys

from mcp import Client
from mcp.types import TextResourceContents


async def run(args: argparse.Namespace) -> None:
    async with Client(args.url) as client:
        result = await client.call_tool(
            "compare_rotations",
            {
                "zone_id": args.zone,
                "depth_m": args.depth,
                "initial_water_fraction": args.reserve,
                "summer_shift_days": args.shift,
            },
        )
        if result.is_error or result.structured_content is None:
            raise RuntimeError(result.content)
        # Preserve the complete envelope: provenance, limitations and missing data are
        # part of the evidence the language/voice agent must receive, not just numbers.
        print(json.dumps(result.structured_content, ensure_ascii=False, indent=2))
        if args.check_card:
            resource = await client.read_resource("ui://cropilot/rotation-card.html")
            for content in resource.contents:
                if content.mime_type != "text/html;profile=mcp-app":
                    raise RuntimeError("Unexpected card MIME type")
                if not isinstance(content, TextResourceContents) or 'id="root"' not in content.text:
                    raise RuntimeError("The built card is missing its root")
            print("PASS: MCP Apps resource is readable", file=sys.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:8000/api/mcp")
    parser.add_argument("--zone", default="pergamino")
    parser.add_argument("--depth", type=float, default=1.0)
    parser.add_argument("--reserve", type=float, default=0.5)
    parser.add_argument("--shift", type=int, default=0)
    parser.add_argument("--check-card", action="store_true")
    asyncio.run(run(parser.parse_args()))


if __name__ == "__main__":
    main()
