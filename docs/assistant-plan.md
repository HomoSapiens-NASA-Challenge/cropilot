# Contextual assistant implementation

Approved scope: the in-app assistant described in the conversation, implemented on
`feat/contextual-assistant`, with a working local demonstration and a pushed branch.

1. Reuse the published evidence selectors from MCP PR #10 (15c1c00), without merging
   its transport or mobile changes. Add bounded, source-backed tools and tests.
2. Add an OpenAI Responses orchestrator and typed HTTP contract. Public demo access
   is explicitly enabled; private planner access requires the existing authenticated
   owner. Keep secrets server-side, enforce request/concurrency budgets, and fail clearly.
3. Add a shared contextual chat panel to the public case and live planner, using the
   generated API client. Render evidence tables from server data, not model numbers.
4. Generate the contract, run lint/types/tests, exercise real OpenAI calls and the
   browser flow, review, document limitations, declare AI usage and push.

Ruling: use the existing clean checkout on a new feature branch, as requested. No
additional worktree is needed; no concurrent implementation is touching this checkout.
Ruling: start with text, published scenario comparisons and read-only planner results.
New planner runs remain in the existing wizard; voice and native-mobile UI are later work.
Ruling: retain the MCP selector files byte-for-byte at their existing module paths so
the pending MCP branch can merge without two implementations of the scientific selection.

Verification must cover exact scenario selection, missing data, unknown citations,
private run ownership, unavailable provider, bounded tool loops and public usage limits.
Do not report schema validation as a guarantee of factual correctness.

Progress: implementation complete. Credential access, live Responses calls, source-backed
browser conversations, desktop/mobile layout, invalid selections and missing regional data
verified. Fourteen assistant tests pass; full backend suite: 96 passed, 15 optional skips.
Monorepo lint/typecheck and web build pass. Independent review findings fixed: per-claim
citations, latest-turn scrolling, byte-identical MCP reuse and missing paired-history tables.
Private owner isolation is tested; a real Google-login planner session remains untested.
Ruling: fixed the existing Windows-only test path, LF contract output and commit-hook
quoting after each blocked the required verification/commit flow. Hooks remain enabled.
