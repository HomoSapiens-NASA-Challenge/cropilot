# Interactive Cropilot rotation card

The user approved adding a compact interactive card to the existing MCP server and
connecting the team's voice agent if its code can be located. Work stays on a new branch
above PR #7; no merge or public deployment is authorized by this implementation step.

## Scope and approach

Keep the existing four tools and existing result fields. Add the published analog campaign
records to the comparison envelope so missing water campaigns remain selectable. Attach an MCP Apps `ui://` HTML
resource to `compare_rotations`; text/voice clients retain the ordinary structured result.
Use the official Apps SDK for the host bridge and the existing React/Vite/Tailwind stack
for one self-contained card, built into the Python backend image. Read results through
the host bridge only, with no browser secrets, external network calls or model execution.

Reusing the whole dashboard would make the conversation card too large. Generating charts
from free-form model output would make the displayed numbers harder to verify. The chosen
implementation uses a compact deterministic view of existing evidence; these are builder
decisions within the approved card scope.

## User flow

An MCP host calls `compare_rotations`. The card receives the result and shows the zone,
historical campaign, depth, initial water and sowing shift. A change of released settings
calls the same tool through the host. A campaign change selects a matching returned episode.
Show one bar and numeric deficit per rotation, missing/closest-match labels, per-crop dates
and stress evidence, and sources with periods, locations and limitations. Historical
scenario results must never be represented as forecasts or measured field water.

Only exact released settings are selectable. Pending calls visibly mark loading and disable
changes; errors preserve a clearly identified last successful result and offer retry.
Validate incoming data using generated API schemas, reject unsupported/malformed results,
and ignore stale completions when a newer host result replaces the displayed evidence.
Missing water in other zones remains unavailable, never Pergamino fallback. The card must
work at 390px and desktop widths and receive refreshed tool results without reloading.

## Delivery and limits

Backend tests verify tool metadata, UI MIME type, resource content/security metadata and
unchanged plain tool behavior. Browser tests use the official SDK/host protocol and actual
local MCP responses, including settings, missing data, errors and narrow layout. Build the
card inside the production backend image and document local build and host connection.
Testing in a local host is not a claim of testing in Claude or native Android/iOS.

Search published team branches and local project files for the voice agent before assuming
a vendor. If unavailable, provide an executable SDK client and exact handoff contract, and
state the unresolved voice integration. No credentials or paid provider are invented.
