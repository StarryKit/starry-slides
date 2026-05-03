# Web App Context

## Purpose

`apps/web` owns app composition and runtime loading behavior for the editor.

Shared roadmap lives in
[ROADMAP.md](/Users/haichao/code/starry-slide/ROADMAP.md).

This package is responsible for:

- loading slide data for the browser app
- composing the editor package into the application shell
- enforcing generated-deck loading policy
- surfacing app-level loading and error states

## Content Sources

The app prefers generated decks from:

- `apps/web/public/generated/current/manifest.json`

`packages/core` provides import helpers for reading manifest-driven decks.

The app does not maintain a sample-slide fallback. A generated deck is required.

## Package Boundary

`apps/web` owns:

- app composition
- generated-deck loading policy
- runtime integration with `packages/core` and `packages/editor`

`apps/web` does not own:

- reusable parsing or mutation logic
- reusable editing operations
- editor interaction semantics

If a change redefines these responsibilities, update the ADRs.
