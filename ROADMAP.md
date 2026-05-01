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

### Milestone 2: Editor Editing Features

Status:

- In progress

Completed work:

- Text editing is already stable enough to support direct in-surface editing,
  commit/cancel flows, and regression-tested undo/redo behavior.
- The editing pipeline is now end-to-end for committed edits: frontend
  interaction, shared history, disk write-back, and refresh persistence are all
  connected through the HTML-first flow.
- The editor UI shell now includes a dedicated top header, a floating
  quick-action toolbar region, and a right-side advanced editing panel
  direction.
- The right-side advanced panel can now be shown and hidden from the header,
  and the panel interaction is covered by E2E regression tests.
- The floating toolbar now appears only after selection, uses icon-based
  actions, and includes mount/unmount motion polish without changing the
  underlying selection timing.
- The editor package has started to adopt the layering direction in code by
  splitting large top-level editor logic into focused hooks and component-level
  styling files.
- The shared editing pipeline now supports CSS-backed edits through a
  `style.update` history operation in `packages/core`, including HTML
  write-back and undo/redo support for inline style changes.
- The right-side advanced editing panel now works as a real property editor
  instead of a read-only inspector:
  - `Edit` and `CSS` tabs exist in the panel
  - grouped editing sections exist for typography, layout, spacing, fill, and
    border
  - a custom CSS entry path exists for arbitrary property/value edits
  - basic form controls now commit CSS changes back into slide HTML
- The `CSS` tab now shows a filtered computed-style snapshot rather than the
  full noisy browser dump, excluding vendor-prefixed and other low-signal
  properties that are not useful for slide editing.
- Initial block manipulation scaffolding now exists for move, resize, and
  rotate flows, including shared history operations for layout style updates
  and first-pass overlay handles in the editor surface.
- Block manipulation now uses a single overlay model for selection and direct
  manipulation, including draggable text and block elements, four-corner resize
  handles, rotation controls, and persisted write-back through the same history
  pipeline.

Current status inside Milestone 2:

- Text editing:
  - functionally complete for the current scope
  - already backed by regression coverage
- Advanced property editing panel:
  - first usable version is implemented
  - shares the same persistence and history pipeline as other edits
- Floating toolbar:
  - visual shell exists
  - visibility and interaction polish are in place for selection and drag flows
  - actions are still placeholder UI and are not yet wired into the shared
    style-editing pipeline
- Block/layout manipulation:
  - move, resize, and rotate are implemented through the editor surface
  - interaction polish is substantially improved, but snapping/alignment helpers
    are still pending
- Style-editing verification:
  - core history behavior exists
  - dedicated E2E coverage for property editing is still missing

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
   - Current status:
     - move, resize, and rotate now have an initial implementation path wired
       into history and write-back
     - interaction polish is still pending, especially around overlay
       presentation, affordance clarity, and final manipulation UX

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
   - Current implementation note:
     - the advanced panel has reached a first functional milestone
     - the next step is to wire the floating toolbar to the same property
       editing pipeline and add regression coverage for style edits

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
- Block manipulation UI reaches a single clear selection model without
  redundant overlays or ambiguous affordances.
- Each feature slice is verified with the appropriate mix of unit tests and E2E
  regression tests.

Recommended next slice:

1. Wire the floating toolbar's common actions to the existing `style.update`
   pipeline.
   - This should cover the true "basic toolbar" subset such as text emphasis,
     alignment, and common color or typography actions.
   - The advanced panel should remain the superset and source of truth for the
     editable property model.
2. Add E2E coverage for style/property editing.
   - Cover at least one select input, one numeric/text input, one custom CSS
     edit, and undo/redo for style changes.
   - This is the missing proof that the new property-editing path is actually
     stable end to end.
3. After toolbar parity and regression coverage are in place, move on to block
   editing workflows.
   - The first concrete block-editing slice should likely be direct
     repositioning via drag, still committing through shared core operations.
