"""Fail CI if the MCP HTML depends on external scripts, styles or assets."""

from html.parser import HTMLParser
from pathlib import Path
import re


class CardParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.has_root = False
        self.has_script = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if attributes.get("id") == "root":
            self.has_root = True
        if tag == "script":
            self.has_script = True
            if attributes.get("src"):
                raise ValueError("MCP card must inline scripts")
        if tag == "link" and attributes.get("rel") in {"stylesheet", "modulepreload"}:
            raise ValueError("MCP card must inline styles and modules")
        if tag in {"img", "source", "video", "audio"} and attributes.get("src"):
            if not attributes["src"].startswith("data:"):
                raise ValueError("MCP card must inline media")


path = Path(__file__).resolve().parents[2] / "apps/backend/app/modules/mcp/ui/mcp-app.html"
html = path.read_text(encoding="utf-8")
parser = CardParser()
parser.feed(html)
if not parser.has_root or not parser.has_script:
    raise ValueError("MCP card is missing the React entry point")
for style in re.findall(r"<style[^>]*>(.*?)</style>", html, flags=re.S):
    for url in re.findall(r"url\((.*?)\)", style):
        if not url.strip("\"'").startswith("data:"):
            raise ValueError("MCP card contains an external CSS asset")
print(f"PASS: self-contained MCP card ({path.stat().st_size} bytes)")
