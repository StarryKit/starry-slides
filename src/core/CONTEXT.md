# Core Context

## Purpose

`src/core` owns the internal slide contract and document operations for
`@starrykit/slides`.

Shared roadmap lives in
[ROADMAP.md](/Users/haichao/code/html-slides-editor/ROADMAP.md).

This module is responsible for:

- parsing manifest-driven generated decks
- reading and validating Contract-compatible slide HTML
- modeling slide documents without replacing HTML as the source of truth
- applying committed slide operations
- preserving undo/redo inversion semantics
- writing edited `htmlSource` back through operation results
- verifying deck packages for the `sslides verify` and `sslides open` paths

## Boundaries

`src/core` must not depend on `src/editor` or `src/runtime`.

Browser-safe core exports live in `src/core/index.ts`. Node-only verifier code
must stay outside that browser-facing barrel because the editor app imports the
barrel and must not pull server-only dependencies such as `jsdom` into the Vite
browser bundle.

Committed editor edits should flow through core operations rather than direct
feature-local persistence logic.

## Current Implementation Status

- manifest-driven deck import helpers are implemented
- slide document parsing and HTML write-back are implemented
- shared history and operation reducer tests exist under `src/core`
- `verify-deck.ts` validates local deck packages for the CLI

## Terms

Use these terms consistently:

- `slide`
- `slide root`
- `editable element`
- `htmlSource`
- `deck package`
- `generated deck`
