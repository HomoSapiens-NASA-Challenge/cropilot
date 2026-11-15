# MCP Rotation App Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task by task.

**Goal:** A compact, source-backed interactive rotation comparison delivered through MCP Apps.

**Architecture:** Attach a self-contained Vite-built React resource to the existing Python
`compare_rotations` tool. Use the official Apps SDK host bridge, generated case schemas and
existing water selection helpers. Preserve the ordinary tool response for voice/text clients.

**Tech Stack:** Python 3.14 MCP SDK 2.3.0, React 19.3, Vite 8, Tailwind 4, official MCP Apps SDK.

**Spec:** ../specs/2026-11-15-mcp-rotation-app-design.md

## Global constraints

- New branch above PR #7; no merges or public deployment.
- Existing case-v1 and frozen scenarios only; preserve units, sources and missing values.
- English product UI, existing tokens and font weights; no handwritten generated files.
- Browser bridge only; no API keys or cross-origin data fetch from the card.

## Review focus

- Unsupported settings must not silently select another scenario.
- Host updates during a pending request must replace old evidence without stale overwrites.
- Non-Pergamino zones must keep missing water and their own sources.
- Invalid tool results or disconnected hosts must render an explicit error, never fake data.
- The backend image must include the built resource, not only work on the developer machine.

### Task 1: MCP resource and evidence contract

- [x] Extend `apps/backend/app/modules/mcp/schemas.py` and `service.py` with published analog
      campaigns, reusing the existing campaign schema and exact source records.
- [x] Add `app_view.py` to own the fixed resource URI, UI MIME, CSP and bundled HTML read.
- [x] Register resource and tool metadata in `server.py`, preserving the four tools.
- [x] Extend `tests/test_mcp.py` for metadata/resource content and unchanged numeric data.

### Task 2: Interactive card and production build

- [x] Add `apps/webapp/mcp-app.html`, `vite.mcp.config.ts`, and a `build:mcp` script.
- [x] Add official MCP Apps SDK and single-file build plugin through pnpm.
- [x] Implement `features/case/mcp-rotation-{schema,card,app}` using generated schemas,
      shared water selection, existing formatting/tokens, and the host tool bridge.
- [x] Mark bundled output ignored; build it into the backend Docker image and check it in CI.
- [x] Validate types, lint, tests, builds, resources/read and real tool calls.

### Task 3: Host verification and handoff

- [x] Exercise the card through an SDK host with actual local backend responses at 390px
      and desktop width: baseline/+7, unsupported profile shift, missing campaign/zone,
      malformed data, failed call, recovery and a replacing host result.
- [x] Capture screenshots outside the source tree; document exact test scope.
- [x] Locate voice code or provide a framework-neutral executable client and honest limit.
- [x] Prepare MCP/build instructions, AI/library attribution in the hub and a branch for a stacked PR.
