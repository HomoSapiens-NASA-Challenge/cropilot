"""The fixed, self-contained view served to MCP Apps hosts."""

from pathlib import Path

from mcp.server.mcpserver.exceptions import ResourceError

RESOURCE_URI = "ui://cropilot/rotation-card.html"
RESOURCE_MIME = "text/html;profile=mcp-app"
HTML_PATH = Path(__file__).parent / "ui" / "mcp-app.html"


def read_rotation_card() -> str:
    try:
        return HTML_PATH.read_text(encoding="utf-8")
    except OSError as error:
        raise ResourceError(
            "The rotation card is not built. "
            "Operator: run pnpm --filter @cropilot/webapp build:mcp."
        ) from error
