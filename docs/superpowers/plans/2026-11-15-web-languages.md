# English and Spanish web interface

User request: synchronize, translate the web into Spanish, retain English as the default,
and add a simple EN / ES selector in the header. This is the approved product behavior.

Architecture: a shared React language store and explicit source-text catalogs. English
is unchanged by default; Spanish is selected manually and persisted locally. Translation
happens while rendering, never by mutating DOM text or scientific data. IDs, routes, source
URLs, model inputs and numeric values remain identical. The document language follows the
selection. No translation provider is called by the product at runtime.

Implementation uses writing-plans, subagent-driven-development and React guidance:

- [x] Shared `lib/i18n` language state, typed translation/interpolation and selector.
- [x] Public landing/navigation/site-page content, with its Spanish catalog.
- [x] Public case blocks, charts, maps, source descriptions and MCP card labels.
- [x] Authenticated platform, forms, planner and assistant/voice controls.
- [x] Catalog coverage and language/persistence/state-preservation browser checks.
- [x] Lint, types, tests, build and independent review; publish on the feature branch without merging main.

Ownership: main agent owns shared i18n, selector, root integration and verification.
Independent implementation agents own landing, case and application scopes respectively.
Catalogs are separated by scope to avoid conflicting edits. Existing local feature branch
is clean and synchronized; preserve it as requested in this session.

Rulings: scope is the web referred to by the user, including its responsive layouts;
the native Expo application is not implicitly rewritten. Dynamic model answers already
follow the question's language; interface language will guide suggested questions.

Latest user refinement: use a compact custom dropdown, displayed as `EN` with a
downward chevron, rather than a native select or two adjacent language buttons.
It reuses the existing accessible dropdown primitives and closes after a selection.
