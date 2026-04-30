# Product Roadmap

This file is the shared planning document for the whole repo.

Use it for:

- product-level roadmap
- cross-package implementation sequencing
- milestone definitions
- links from milestones to implementation issues

Do not put package boundary rules here. Those belong in `CONTEXT-MAP.md` and
the per-package `CONTEXT.md` files.

Do not use this file as the canonical todo list. GitHub Issues are the todo
system for this repo.

## Roadmap Draft

This roadmap tracks project-level milestones.

GitHub Issues are the execution queue. Each milestone should link to the issues
that implement it.

## Issue Template

Use [implementation-task.md](/Users/haichao/code/html-slides-editor/.github/ISSUE_TEMPLATE/implementation-task.md)
for every implementation issue created from the roadmap.

## Milestones

### Milestone 1: Foundation Setup

Status:

- Mostly complete

Goal:

- Establish the base project structure, validation workflow, and documentation
  foundations required for later editor work.

Scope:

- Set up the base workspace and package structure.
- Clarify the product goal and the HTML-first editing direction.
- Complete initial experimental validation and regression seams.
- Add QA standards, context documents, and ADR scaffolding for future work.

Exit criteria:

- The project structure supports layered evolution across `core`, `editor`, and
  `web app`.
- The default verification path is established and standardized around
  `pnpm verify`.
- Core context documents, ADRs, and QA constraints exist and provide clear
  boundaries for future implementation work.

Related issues:

- add GitHub issue links here

### Milestone 2: Editor Editing Features

Status:

- In progress

Goal:

- Use the agreed editor layering model to complete the editing pipeline
  standard and incrementally ship the core editing capabilities.

Scope:

- Formalize the editor pipeline standard across the project.
- Implement the first set of concrete editing features in the editor.

#### 2a. Formalize the Editor Layering Standard

The editor design is organized into these layers:

- interaction layer
- editor state layer
- history layer
- version management layer

Expected direction:

- The interaction layer owns user-facing triggers such as selection, editing
  entry points, toolbar actions, and drag interactions.
- The editor state layer owns transient state maintained inside
  `packages/editor`, such as active selection, in-progress editing state, and
  UI coordination state.
- The history layer owns shared operations, undo/redo behavior, and HTML
  write-back semantics through `packages/core`.
- The version management layer sits above history and is reserved for future
  checkpointing, versioning, and related persistence workflows.

Design rule:

- New editor features should follow the direction
  `interaction -> editor state -> history -> version management`.
- `packages/editor` should own transient UI and interaction concerns.
- `packages/core` should own reusable operations, history transitions, and
  persistence-facing write-back behavior.
- Any feature that breaks this layering should trigger an ADR review.

#### 2b. Expand Concrete Editor Features

Features:

1. Text editing
   - Support editing text elements directly in the slide surface.
   - Double click should enter text editing mode for a text-marked element.
   - The full text-editing flow should cover entering edit mode, committing,
     canceling, and maintaining stable undo/redo behavior.

2. Block editing
   - Support editing block-level elements as layout objects rather than only as
     text containers.
   - Initial block editing should focus on direct manipulation behaviors such
     as repositioning, resizing, and rotation or transform-related updates,
     where those behaviors can be represented safely in the HTML-first model.
   - These edits should still flow through the same shared history and
     persistence pipeline as other editor features.

3. Toolbar and property editing
   - After selecting an editable element, the editor should expose element-aware
     editing controls through the toolbar system.
   - The toolbar should have two levels:
     - a lightweight floating toolbar near the selected element, above or below
       the active selection, for common high-frequency edits
     - an advanced editing panel on the right side, evolving from the current
       inspector panel into a more complete property editor
   - The floating toolbar should adapt based on the selected element type and
     surface only the most common actions for that selection.
   - The advanced panel should provide a broader visual editor for CSS-backed
     properties, going beyond the minimal controls offered by the floating
     toolbar.

4. Layout assistance
   - Layout editing should eventually include assistance behaviors that make
     direct manipulation more predictable and precise.
   - Candidate helpers include snapping, alignment assistance, spatial guides,
     and constraints that reduce accidental drift during drag or resize flows.
   - The first implementation does not need to include every helper, but the
     design should leave room for these features as part of the layout-editing
     direction.

Exit criteria:

- The editor layering standard is explicitly documented in the relevant context
  documents and remains aligned with the ADR direction.
- All text-editing flows reach a stable, regression-tested standard.
- Toolbar-driven property changes have a clear interaction path and a clear
  persistence/write-back path.
- Block and layout editing features follow the same layered direction as other
  editor functionality.
- Each feature slice is verified with the appropriate mix of unit tests and E2E
  regression tests.

Related issues:

- add GitHub issue links here
