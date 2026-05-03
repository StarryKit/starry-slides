# Editor Context

## Purpose

`packages/editor` owns the interactive editor UI.

Shared roadmap lives in
[ROADMAP.md](/Users/haichao/code/starry-slides/ROADMAP.md).

This package is responsible for:

- rendering the editing shell around slide content
- translating user interactions into core operations
- managing transient interaction state such as selection and in-progress editing
- rendering overlays, thumbnails, and sidebar tool panel views

It consumes `packages/core` APIs and should not redefine document or history
semantics locally.

## Current Implementation Status

- text double-click editing is partially implemented
- local undo/redo for committed text edits is implemented through core history
- the sidebar tool panel edits CSS-backed properties through core style operations
- layout editing primitives exist only in early utility form and are not yet a
  full user workflow

## Current Interaction Model

The editor currently owns transient behavior such as:

- active slide selection
- editable element selection
- selection overlay placement
- text-editing session state
- keyboard shortcuts that trigger shared history actions

Committed edits must flow through `packages/core` operations rather than direct
feature-local persistence logic.
