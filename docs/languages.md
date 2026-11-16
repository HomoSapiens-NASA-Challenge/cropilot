# Web languages

English remains the default, regardless of the browser language. The header's compact
EN / ES dropdown changes the interface immediately and persists the explicit choice under
`cropilot.language.v1` in local storage. If storage is unavailable, switching still works
for the current tab. Other open tabs follow changes through the storage event.

The web interface covers the public site, regional case views, source/limitation text,
authentication/onboarding, the planner and assistant/voice controls. The native Expo app
is outside this web change. Existing screenshots and recordings preserve their original
English content and show a Spanish explanatory note when Spanish is selected. Model
answers follow the question's language; user-entered text is never silently translated.

`useI18n()` subscribes React components to the selected locale. `t(source, values)`
looks up English source text in `src/locales/es-*.ts` and substitutes named placeholders.
Use `translate()` in presentation helpers; the rendering component must subscribe through
`useI18n()` so locale changes rerender it. No translation API runs in the product.

Keep routes, identifiers, form values, source URLs, research data and state in their
original form. Translate only labels/explanations at presentation time. Use stable IDs
for React keys; changing language must not clear a form, map or scenario selection.
Numbers and dates use explicit locale-aware formatting where appropriate; scientific
values and their units are unchanged. Do not translate mathematical signs or turn missing
data into zero. Official dataset/product names retain their identity.

Add source strings and Spanish translations together. `pnpm --filter @cropilot/webapp test`
checks literal-call coverage, duplicate/empty entries, interpolation placeholders, numeric
tokens and URLs. It supplements human scientific/linguistic review, not replaces it.
Unknown runtime strings fall back to their original text, never invented measurements.

The catalogs were prepared with Codex and bounded offline OpenAI translation requests,
using public product/research explanations only; credentials and intermediate responses
remain outside Git. The team declaration lives in the hub's `submission.md`.

## Verification on 2026-11-15

`pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` passed. Backend tests:
147 passed and 15 skipped. Catalog checks: 2,770 entries and 865 literal calls;
placeholders, numeric tokens and URLs preserved. The self-contained MCP card build
also passed its artifact check. Vite reports large bundle warnings.

Real Chromium checks passed for English default on an es-AR browser, the custom
dropdown (keyboard opening, checked selection and closing), Spanish persistence,
cross-tab changes, disabled local storage, all ten regional case pages and mobile
layout. Switching languages preserves scenario controls and an assistant draft.
No page JavaScript errors were observed. Google-authenticated flows and a live MCP
host were not exercised in this pass.

An additional live voice regression transcribed Spanish and returned an answer
(HTTP 200 for both), but speech generation returned the existing unavailable
fallback. Therefore this pass does not establish successful voice playback. The
backend and OpenAI integration are unchanged by localization.
