# Core Context

## Purpose

`packages/core` owns the reusable document model and mutation pipeline for the
editor.

Shared roadmap lives in
[ROADMAP.md](/Users/haichao/code/html-slides-editor/ROADMAP.md).

This package is the source of truth for:

- slide parsing and normalization
- slide contracts and stable selectors
- HTML write-back
- reusable editing operations
- shared undo/redo history transitions
- geometry helpers used by higher layers
- generated-deck import helpers

## Core Domain

The central object is `SlideModel`:

- `id`
- `title`
- `htmlSource`
- `rootSelector`
- `width` / `height`
- `elements`

`htmlSource` is the persisted slide state. Runtime state may be derived from
it, but edits must write back into HTML.

## Slide Contract

Slides must preserve these attributes:

- one slide root marked with `data-slide-root="true"`
- root dimensions via `data-slide-width` and `data-slide-height`
- editable nodes marked with `data-editable="text" | "image" | "block"`
- stable editor targeting through `data-editor-id`

Treat these as product contracts, not incidental DOM details.

## Editing Direction

Per ADR-0001, editing follows this pipeline:

1. user interaction produces editor operations
2. operations update in-memory slide state
3. updated state writes back into `htmlSource`
4. history/versioning layers sit on top

The shared document history model belongs here so user-driven UI edits and
future agent-driven edits can use the same undo/redo semantics.

## Package Boundary

`packages/core` owns:

- parsing and normalization
- HTML mutation and serializer behavior
- reusable slide import helpers
- document operations and inversion logic
- shared history state and reducer logic
- stage/slide geometry helpers that are UI-agnostic

`packages/core` does not own:

- selection overlays
- transient editor session state
- DOM event wiring
- inspector UI
- viewport UI state

If a change redefines these responsibilities, update the ADRs.

## Testing Expectations

Changes in `packages/core` should usually add focused unit tests for:

- parsing and normalization
- operation application
- inversion logic
- HTML write-back
- history reducer behavior
- geometry transformations when they affect editing outcomes
