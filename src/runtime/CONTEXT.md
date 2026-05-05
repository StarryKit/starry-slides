# Runtime Context

## Purpose

`src/runtime` owns local runtime concerns for opening and serving deck packages
inside `@starrykit/slides`.

Shared roadmap lives in
[ROADMAP.md](/Users/haichao/code/html-slides-editor/ROADMAP.md).

This module is responsible for:

- resolving the deck path used by `sslides`
- choosing local ports for the editor server
- opening the browser after the editor server starts
- supporting local deck mounting in cooperation with the root Vite config

The root `vite.config.ts` owns the dev and preview middleware that serves:

- `/deck/*` for the active deck package
- `/__editor/save-generated-deck` for local write-back
- `/__editor/reset-generated-deck` for test reset behavior

## Content Sources

Normal local development serves:

- `sample-slides/`

CLI opening uses `STARRY_SLIDES_DECK_DIR` to mount the deck passed to
`sslides open`.

E2E runs use an ignored temporary deck in `.e2e-test-slides/`. That directory is
served only when the Vite process runs with `STARRY_SLIDES_DECK_SOURCE=e2e`.

The app does not maintain a fallback deck. The selected deck must be a
Contract-compatible deck package.

## Boundaries

`src/runtime` may depend on `src/core` when runtime behavior needs validation or
contract-aware helpers. It must not own editor interaction semantics or duplicate
core document operations.
