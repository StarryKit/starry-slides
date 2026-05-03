# ADR-0002: Package boundaries for core, editor, and app

- Status: accepted
- Date: 2026-04-30

## Context

The initial workspace split introduced three packages:

- `packages/core`
- `packages/react`
- `packages/stage`

In practice, `packages/react` only handled slide loading and React state for the app. That created two problems:

- slide import behavior was not reusable outside React components
- product-specific deck loading concerns leaked into reusable packages

The project also needs a cleaner separation for future automation work. The app will keep serving human-driven editing flows, while future AI agents may call core editing methods directly without going through the editor UI.

ADR-0001 already established that editing flows should be based on reusable operations and HTML write-back. The package layout should reinforce that same direction.

## Decision

The workspace will use these package boundaries:

1. `packages/core` provides reusable slide parsing, normalization, import, mutation methods, and shared document/history state transitions.
2. `packages/editor` provides the interactive editor UI, translates user interactions into core actions, and does not own document/history semantics.
3. `apps/web` owns app composition and generated-deck loading policy.

As part of this decision:

- `packages/stage` is renamed to `packages/editor`
- `packages/react` is removed
- manifest-driven slide import moves into `packages/core` as a reusable helper
- the app stops maintaining a built-in sample-slide fallback

## Consequences

Benefits:

- core APIs are reusable by the web app, future automation flows, and non-React callers
- the editor package has a narrower responsibility as the manual editing UI
- user-driven edits and future agent-driven edits can share the same document history model
- product-specific loading policy stays in the app
- the app and E2E suite both exercise the same generated-deck import path

Costs:

- the app now owns a small amount of React loading code
- package rename requires updates across imports, workspace scripts, and docs
- core now owns a larger share of state-transition logic and must keep those APIs UI-agnostic

## Non-goals

This decision does not:

- define the future AI agent interface in detail
- add a persistence backend beyond current manifest and sample loading
- change ADR-0001's editing pipeline or operation model
- move selection overlays, viewport state, or in-progress text-editing UI state into `packages/core`

## Implementation Plan

- **Affected paths**: `packages/core/src/index.ts`, `packages/core/src/index.test.ts`, `packages/editor/src/index.tsx`, `packages/editor/`, `apps/web/src/`, `package.json`, `README.md`, `CONTEXT.md`, `docs/adr/README.md`
- **Core changes**: expose manifest import helpers, reusable slide operations, and a shared history reducer/state model that can be called by both editor UI and future automation flows
- **Editor changes**: accept `slides` and `sourceLabel` as props; do not fetch decks or define sample slides internally; keep only transient interaction state such as selection and in-progress text editing
- **App changes**: load generated decks through core helpers and surface an error state when no generated deck is available
- **Removal**: delete `packages/react`
- **Naming**: replace `stage package` references with `editor package` where they refer to package/module boundaries

## Verification

- [ ] `packages/core` exports manifest-driven slide import helpers without depending on React
- [ ] `packages/core` owns shared history/document state transitions without depending on editor UI state
- [ ] `packages/editor` no longer imports from `@starry-slide/react`
- [ ] `packages/editor` consumes core history APIs instead of maintaining its own document history implementation
- [ ] `apps/web` renders generated decks through the new boundaries
- [ ] the workspace builds successfully after removing `packages/react`
- [ ] existing editor interaction tests still pass
