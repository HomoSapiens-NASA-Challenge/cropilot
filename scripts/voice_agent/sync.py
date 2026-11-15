"""Creates or updates the Cropilot voice agent and its client tools in ElevenLabs.

Idempotent: tools are matched by name and updated in place; the agent is created the first time and
updated afterwards when ELEVENLABS_AGENT_ID is set. Standard library only.

    ELEVENLABS_API_KEY=... python scripts/voice_agent/sync.py

Prints the agent id to copy into ELEVENLABS_AGENT_ID in the root `.env`.
"""

import json
import os
import sys
from pathlib import Path
from typing import Any
from urllib.error import HTTPError
from urllib.request import Request, urlopen

API = "https://api.elevenlabs.io/v1/convai"
HERE = Path(__file__).resolve().parent
AGENT_NAME = "Cropilot case assistant"
# Multilingual and low latency; the prompt answers in the user's language.
TTS_MODEL = "eleven_flash_v2_5"
LANGUAGE = "en"
FIRST_MESSAGE = (
    "Hi, I'm the Cropilot assistant. I can walk you through how this campaign started and how "
    "each rotation did in years like this one. What would you like to know?"
)
ZONE_ID = {"type": "string", "description": "Zone id such as pergamino; empty for the app's zone."}
SCREENS = ["overview", "years", "strategies", "map", "strategy", "campaign", "water", "method"]

# Client tools run in the app (apps/mobile/src/features/voice/client-tools.ts, same names).
TOOLS: list[dict[str, Any]] = [
    {
        "name": "get_national_campaign",
        "description": (
            "How the 2026/27 campaign started in every zone with a case: ONI Jul-Sep, soil wetness "
            "at the end of August and its percentile, and the modules of each zone. Use it to "
            "compare zones or to find a zone id."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_case_briefing",
        "description": (
            "The case of one zone: the decision moment, the analog campaigns (years like this), "
            "the five strategies with their margins in each analog year, risk percentiles, limits "
            "and sources. Call it before answering about a zone."
        ),
        "parameters": {"type": "object", "properties": {"zone_id": ZONE_ID}, "required": []},
    },
    {
        "name": "get_strategy_details",
        "description": (
            "Why one strategy is what it is: the explained answers with their sources and the "
            "analog years where it ranks above or below each other strategy."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "zone_id": ZONE_ID,
                "strategy_id": {
                    "type": "string",
                    "description": "Strategy id from the briefing, such as maize-soy-soy.",
                },
            },
            "required": ["strategy_id"],
        },
    },
    {
        "name": "show_case_screen",
        "description": (
            "Opens a screen of the app so the user sees what you talk about. strategy needs id = "
            "a strategy id; campaign needs id = a campaign such as 1997/98."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "screen": {"type": "string", "enum": SCREENS, "description": "Screen to open."},
                "id": {"type": "string", "description": "Strategy id or campaign, when needed."},
                "zone_id": ZONE_ID,
            },
            "required": ["screen"],
        },
    },
]


JsonObject = dict[str, Any]


def call(method: str, path: str, api_key: str, body: JsonObject | None = None) -> JsonObject:
    request = Request(
        f"{API}{path}",
        method=method,
        data=None if body is None else json.dumps(body).encode(),
        headers={"xi-api-key": api_key, "Content-Type": "application/json"},
    )
    try:
        with urlopen(request, timeout=30) as response:
            payload = json.load(response)
    except HTTPError as error:
        detail = error.read().decode(errors="replace")
        raise SystemExit(f"{method} {path} failed with {error.code}: {detail}") from error
    if not isinstance(payload, dict):
        raise SystemExit(f"{method} {path} did not answer with an object")
    return payload


def sync_tools(api_key: str) -> list[str]:
    existing = {
        tool["tool_config"]["name"]: tool["id"]
        for tool in call("GET", "/tools", api_key).get("tools", [])
    }
    ids = []
    for tool in TOOLS:
        config = {
            "tool_config": {
                "type": "client",
                **tool,
                "expects_response": True,
                "response_timeout_secs": 20,
            }
        }
        if tool["name"] in existing:
            tool_id = existing[tool["name"]]
            call("PATCH", f"/tools/{tool_id}", api_key, config)
        else:
            tool_id = call("POST", "/tools", api_key, config)["id"]
        ids.append(tool_id)
        sys.stderr.write(f"tool {tool['name']}: {tool_id}{os.linesep}")
    return ids


def agent_body(tool_ids: list[str]) -> dict[str, Any]:
    return {
        "name": AGENT_NAME,
        "conversation_config": {
            "agent": {
                "first_message": FIRST_MESSAGE,
                "language": LANGUAGE,
                "prompt": {
                    "prompt": (HERE / "prompt.md").read_text(encoding="utf-8"),
                    "tool_ids": tool_ids,
                },
            },
            "tts": {"model_id": TTS_MODEL},
        },
        # Private: the app only connects with a token minted by the backend.
        "platform_settings": {"auth": {"enable_auth": True}},
    }


def main() -> None:
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise SystemExit("Set ELEVENLABS_API_KEY")
    body = agent_body(sync_tools(api_key))
    agent_id = os.environ.get("ELEVENLABS_AGENT_ID")
    if agent_id:
        call("PATCH", f"/agents/{agent_id}", api_key, body)
    else:
        agent_id = call("POST", "/agents/create", api_key, body)["agent_id"]
    sys.stdout.write(f"{agent_id}{os.linesep}")


if __name__ == "__main__":
    main()
