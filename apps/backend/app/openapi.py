"""Print the OpenAPI schema: the input of the generated TypeScript client."""

import json
import sys

from app.main import app

json.dump(app.openapi(), sys.stdout, indent=2)
sys.stdout.write("\n")
