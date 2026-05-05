# Milestone 2: Editor Editing Features and Editing-Only Release

Status:

- Release candidate in progress

Release intent:

- Ship Milestone 2 as a standalone editing-only version before Agent work
  begins.
- This release should preserve the current local generated-deck editing model
  and should not include Agent execution, real chat actions, or AI-backed slide
  generation/modification inside the app.
- Agent integration, conversational edits, production AI flows, and deployment
  hardening belong to Milestone 3.

Completed work:

- Text editing is stable enough to support direct in-surface editing,
  commit/cancel flows, keyboard undo/redo, and regression-tested whitespace and
  selection behavior.
- The editing pipeline is end-to-end for committed edits: frontend interaction,
  shared history, disk write-back, and refresh persistence are connected through
  the HTML-first flow.
- The editor UI shell includes a dedicated top header, slide sidebar, floating
  toolbar, right-side advanced editing panel, and generated-deck loading states.
- The editor package has adopted the layering direction in code by splitting
  large top-level editor logic into focused hooks and components.
- `packages/core` supports `text.update`, `style.update`, and
  `element.layout.update` operations with HTML write-back and undo/redo.
- The right-side advanced editing panel works as a real property editor:
  - grouped sections exist for typography, layout, spacing, fill, and shape
  - the `CSS` tab shows a filtered computed-style snapshot
  - custom CSS entry exists for arbitrary property/value edits
  - controls commit CSS changes back into slide HTML
- The floating toolbar commits common formatting actions through the shared
  style-editing pipeline, including font family, font size, emphasis, text
  decoration, text color, alignment, arrange/layer actions, and delete.
- Block manipulation uses a single overlay model for selection and direct
  manipulation, including draggable text/block elements, four-corner resize
  handles, rotation controls, and persisted write-back.
- Style editing has dedicated E2E coverage for panel-driven numeric edits,
  typography controls, layout controls, fill/shape controls, custom CSS, and
  undo behavior.
- Floating toolbar behavior has E2E coverage for visibility, menu content,
  font-size mutation without toolbar remount, and delete behavior.
- The generated-deck app flow supports debounced write-back to disk through the
  Vite app middleware and refresh persistence for committed edits.
- A chat-side panel and AI UI elements exist as interface scaffolding, but they
  are sample/static UI only and are not part of the Milestone 2 release scope.

Current status inside Milestone 2:

- Text editing:
  - complete for the editing-only release scope
  - backed by regression coverage
- Advanced property editing panel:
  - complete enough for the editing-only release
  - shares the same persistence and history pipeline as other edits
  - covered by targeted E2E tests
- Floating toolbar:
  - common editing actions are wired into the shared style-editing pipeline
  - visibility and interaction polish are in place for selection and drag flows
  - advanced parity with every right-panel field is not required for Milestone 2
- Block/layout manipulation:
  - move, resize, and rotate have initial implementation paths through the
    editor surface
  - direct movement and overlay behavior have regression coverage
  - drag-time snap/alignment assistance is still pending and should be treated
    as a Milestone 2 release feature
  - resize/rotate interaction coverage is still pending
- Product/release readiness:
  - `pnpm verify` is the expected pre-release gate
  - release notes, version boundary, and public packaging/deployment notes are
    still pending

Goal:

- Use the agreed editor layering model to complete the editing pipeline
  standard and ship the core editing capabilities as an editing-only release.

Scope:

- Formalize the editor pipeline standard across the project.
- Implement the first set of concrete editing features in the editor.
- Prepare a standalone Milestone 2 release that excludes Agent functionality.

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
  `src/editor`, such as active selection, in-progress editing state, and
  UI coordination state.
- The history layer owns shared operations, undo/redo behavior, and HTML
  write-back semantics through `packages/core`.
- The version management layer sits above history and is reserved for future
  checkpointing, versioning, and related persistence workflows.

Design rule:

- New editor features should follow the direction
  `interaction -> editor state -> history -> version management`.
- `src/editor` should own transient UI and interaction concerns.
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
   - Current status:
     - complete for the Milestone 2 release scope
     - covered by unit and E2E tests

2. Block editing
   - Support editing block-level elements as layout objects rather than only as
     text containers.
   - Initial block editing should focus on direct manipulation behaviors such
     as repositioning, resizing, and rotation or transform-related updates,
     where those behaviors can be represented safely in the HTML-first model.
   - These edits should still flow through the same shared history and
     persistence pipeline as other editor features.
   - Current status:
     - move, resize, and rotate have initial implementation paths wired into
       history and write-back
     - movement and single-overlay behavior are regression-tested
     - drag-time snap/alignment assistance is still pending and is part of the
       Milestone 2 release scope
     - resize/rotate regression depth is still pending

3. Toolbar and property editing
   - After selecting an editable element, the editor should expose element-aware
     editing controls through the toolbar system.
   - The toolbar should have two levels:
     - a lightweight floating toolbar near the selected element, above or below
       the active selection, for common high-frequency edits
     - an advanced editing panel on the right side as the broader property
       editor
   - The floating toolbar should adapt based on the selected element type and
     surface only the most common actions for that selection.
   - The advanced panel should provide a broader visual editor for CSS-backed
     properties, going beyond the minimal controls offered by the floating
     toolbar.
   - Current implementation note:
     - the advanced panel has reached a functional editing milestone
     - the floating toolbar is wired to the same property editing pipeline for
       common actions
     - both panel and toolbar paths have E2E coverage for core release flows

4. Layout assistance
   - Layout editing should include a drag-time snap system before the Milestone
     2 standalone release.
   - The first snap system should make direct block manipulation feel precise
     without changing the HTML-first write-back model.
   - Required snap targets:
     - slide edges and slide center lines
     - selected element edges and center lines
     - sibling editable element edges and center lines
   - Required interaction behavior:
     - apply snapping only while dragging or resizing, within a small threshold
     - show spatial guide lines for the active snap target
     - commit only the final snapped layout value through the existing
       `element.layout.update` history operation
     - avoid creating extra history entries while the user is still dragging
   - Nice-to-have helpers, if they fit the release schedule:
     - equal-spacing hints between sibling elements
     - modifier-key override to temporarily disable snapping
     - configurable snap threshold

5. Editing-only release preparation
   - Freeze the Milestone 2 release boundary around editor functionality.
   - Keep Agent/chat-backed actions, AI generation inside the app, and
     production deployment work out of this release.
   - Ensure the release has a clean verification path, clear README guidance,
     and a short release note explaining the current local generated-deck
     workflow.

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
- Dragging and resizing blocks includes a visible snap/alignment system for
  common slide and sibling-element alignment targets.
- Each feature slice is verified with the appropriate mix of unit tests and E2E
  regression tests.
- The editing-only release explicitly excludes Agent functionality and can be
  explained as a local generated-deck editor.
- `pnpm verify` passes before publishing the release.

Remaining Milestone 2 work before release:

1. Run and fix the full release gate.
   - `pnpm verify` is the pre-release source of truth.
   - Any failing lint, unit, build, or E2E result should be fixed inside the
     Milestone 2 editing-only boundary.
2. Add the missing release-facing documentation.
   - Document how to generate a deck, open the editor, edit slides, and rely on
     local write-back.
   - Make clear that Agent/chat actions are not active in this release.
3. Implement drag-time snap/alignment assistance for block manipulation.
   - Snap to slide edges, slide center lines, and sibling editable element
     edges/centers.
   - Show guide lines for active snap targets during drag/resize.
   - Commit the final snapped layout through the existing layout history
     operation without recording intermediate drag frames.
   - Add E2E coverage for at least one slide-center snap and one sibling-edge
     snap.
   - E2E fixture stabilization approach: use dedicated generated slides for
     targeted interaction coverage. Slide-center snapping is tested on a clean
     one-block slide, while sibling-edge and equal-spacing snapping are tested
     on a separate three-block slide. This keeps Playwright assertions away
     from unrelated deck content and reduces false failures from busy layouts.
4. Decide whether resize/rotate E2E coverage blocks the release.
   - Movement and overlay behavior are already covered.
   - If resize/rotate is considered release-critical, add targeted E2E tests
     before tagging the Milestone 2 release.
   - If not, track deeper manipulation coverage as follow-up work.
5. Do a final UX pass on the editing-only surface.
   - Confirm empty/loading/error states.
   - Confirm toolbar and advanced panel copy does not imply active AI behavior.
   - Confirm the static chat panel is hidden, labelled as preview-only, or
     deferred if it creates release ambiguity.

