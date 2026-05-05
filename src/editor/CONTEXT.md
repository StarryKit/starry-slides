# Editor Context

## Purpose

`src/editor` owns the interactive browser editor UI inside `@starrykit/slides`.

Shared roadmap lives in
[ROADMAP.md](/Users/haichao/code/html-slides-editor/ROADMAP.md).

This module is responsible for:

- rendering the editing shell around slide content
- composing the root browser app under `src/editor/app`
- translating user interactions into `src/core` operations
- managing transient interaction state such as selection and in-progress editing
- rendering overlays, thumbnails, floating toolbar, and sidebar tool panel views
- providing Tailwind/shadcn editor chrome and UI primitives

It consumes `src/core` APIs and should not redefine document or history
semantics locally.

## Current Implementation Status

- text double-click editing is implemented for supported editable text elements
- local undo/redo for committed edits is implemented through core history
- the sidebar tool panel edits CSS-backed properties through core style
  operations
- block movement and resizing support snapping through editor interaction
  helpers
- the browser app loads manifest-driven decks through `/deck/manifest.json`

## Current Interaction Model

The editor owns transient behavior such as:

- active slide selection
- editable element selection
- selection overlay placement
- text-editing session state
- keyboard shortcuts that trigger shared history actions

Committed edits must flow through `src/core` operations rather than direct
feature-local persistence logic.
