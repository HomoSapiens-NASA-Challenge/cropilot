"""Print the OpenAPI schema: the input of the generated TypeScript client."""

import json
import sys

from app.main import app

# Binary output keeps the generated contract identical on Windows and Linux.
sys.stdout.buffer.write((json.dumps(app.openapi(), indent=2) + "\n").encode("utf-8"))
