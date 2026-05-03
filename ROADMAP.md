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

Use [implementation-task.md](/Users/haichao/code/starry-slides/.github/ISSUE_TEMPLATE/implementation-task.md)
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

### Milestone 2: Editor Editing Features and Editing-Only Release

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
  - resize/rotate interaction coverage and snapping/alignment helpers are still
    pending
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
     - resize/rotate regression depth, snapping, and alignment assistance are
       still pending

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
   - Layout editing should eventually include assistance behaviors that make
     direct manipulation more predictable and precise.
   - Candidate helpers include snapping, alignment assistance, spatial guides,
     and constraints that reduce accidental drift during drag or resize flows.
   - Full layout assistance is not required for the Milestone 2 standalone
     release, but the design should leave room for these features as part of
     the layout-editing direction.

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
3. Decide whether resize/rotate E2E coverage blocks the release.
   - Movement and overlay behavior are already covered.
   - If resize/rotate is considered release-critical, add targeted E2E tests
     before tagging the Milestone 2 release.
   - If not, track deeper manipulation coverage as follow-up work.
4. Do a final UX pass on the editing-only surface.
   - Confirm empty/loading/error states.
   - Confirm toolbar and advanced panel copy does not imply active AI behavior.
   - Confirm the static chat panel is hidden, labelled as preview-only, or
     deferred if it creates release ambiguity.

### Milestone 3: Agent-Integrated AI Slide Workflow and Productization

Status:

- Planned

Goal:

- Integrate an Agent into the product so users can generate, inspect, modify,
  and persist HTML slides through a complete AI-assisted workflow.
- Productize the app beyond the local editing demo by adding deployment,
  operational boundaries, and user-facing documentation.

Scope:

- Agent integration for slide generation and modification.
- A complete AI workflow from prompt to generated deck to editable HTML slides.
- A complete AI modification workflow from user request to proposed edits,
  review, application, undo/redo, and persisted output.
- Product deployment and documentation required for real usage outside the
  local development loop.

Non-goals inherited from Milestone 2:

- Milestone 3 should not regress the editing-only capabilities already shipped
  in Milestone 2.
- Agent operations must use the existing HTML-first editing model instead of
  introducing a separate proprietary deck format.

#### 3a. Agent Architecture and Trust Boundary

Expected direction:

- Define the Agent runtime boundary and decide whether the first productized
  path runs locally, server-side, or through a hosted job/execution service.
- Define the tool contract between the app, Agent, slide protocol tools, and
  editor operations.
- Treat Agent output as untrusted until validated by the slide protocol and
  imported through `packages/core`.
- Keep the editor's shared operations as the mutation path for accepted edits
  whenever possible, so human edits and AI edits share history semantics.

Implementation topics:

- Agent request/response schema for deck generation and deck modification.
- Tool calls for reading the current deck, reading selected slide/element
  context, proposing changes, validating HTML, and applying accepted edits.
- Error states for invalid output, partial generation, timeout, and model/tool
  failures.
- Audit trail or structured activity log for Agent actions.

#### 3b. AI Slide Generation Workflow

Expected workflow:

1. User provides topic, audience, goals, source material, style direction, and
   slide count constraints.
2. Agent creates or selects a slide plan.
3. Agent generates protocol-compatible HTML slides and a manifest.
4. Protocol validation runs before slides enter the editor.
5. The editor loads the generated deck with stable editable markers,
   thumbnails, and full edit/write-back support.

Implementation topics:

- Product UI for generation inputs and progress.
- Reuse or evolve `skills/html-slides-generator` and `skills/slides-protocol`
  as the generation foundation.
- Validation and repair loop for Agent-generated HTML.
- Style pack selection or style direction handling.
- Generated deck storage, naming, and refresh behavior.

#### 3c. AI Slide Modification Workflow

Expected workflow:

1. User asks for a change scoped to the selected element, current slide, or
   whole deck.
2. Agent receives structured context from the editor and current deck.
3. Agent proposes copy, style, layout, or structural changes.
4. The app previews the proposed change or shows a structured diff.
5. User accepts, rejects, or asks for revision.
6. Accepted changes are applied through shared operations or a validated HTML
   replacement path, then persist through the same write-back/version path.

Implementation topics:

- Replace the current static chat panel with a live Agent-backed workflow.
- Scope controls for selected element, current slide, and whole deck.
- Proposed edit representation:
  - operation list for text/style/layout changes where possible
  - validated slide HTML replacement only when operations are insufficient
- Preview, accept/reject, undo/redo, and retry behavior.
- Regression tests for AI-applied edits using deterministic fixtures or mocked
  Agent responses.

#### 3d. Versioning, Persistence, and Review

Expected direction:

- Promote the reserved version management layer into a real product concept.
- Preserve clear separation between transient editor state, committed history,
  saved deck state, and Agent-generated proposals.

Implementation topics:

- Deck/project model for multiple generated decks instead of only
  `generated/current`.
- Checkpoints or versions before and after Agent actions.
- Recovery behavior for failed saves and invalid Agent edits.
- Export/import boundaries for saved projects.
- Optional collaboration-safe shape if multi-user editing becomes a near-term
  goal.

#### 3e. Deployment and Productization

Expected direction:

- Move from a local Vite middleware demo to a productized deployment shape with
  explicit storage, runtime, and security assumptions.

Implementation topics:

- Choose the first deployment target and runtime model.
- Replace local file write-back assumptions with a deployable persistence
  strategy.
- Configure environment variables, model/provider settings, and storage
  credentials.
- Add health checks, build verification, and deploy documentation.
- Review security boundaries for uploaded sources, generated HTML, embedded
  assets, Agent tool access, and persisted deck data.

#### 3f. Documentation

Expected direction:

- Make the project understandable for both users and contributors.

Documentation topics:

- User guide for generating decks, editing slides, and applying AI changes.
- Contributor guide for packages, skills, protocol tools, and test workflow.
- Agent integration architecture document.
- Deployment guide for the chosen product runtime.
- Troubleshooting guide for validation failures, save failures, and Agent
  errors.

Exit criteria:

- Users can generate a new deck through the product UI, validate it, open it in
  the editor, modify it manually, and persist the result.
- Users can request AI changes to a selected element, current slide, and whole
  deck, then preview and accept/reject those changes.
- Accepted Agent edits share the editor's history/persistence model or have a
  documented validated replacement path.
- The app has a documented deployment path with explicit storage and runtime
  assumptions.
- Agent output validation, error handling, and recovery behavior are covered by
  tests.
- Product and contributor documentation are updated enough for a new user to
  run, deploy, and extend the system.

Recommended first Milestone 3 slice:

1. Define the Agent integration contract.
   - Specify context payloads, proposed edit format, validation behavior, and
     apply/reject semantics.
2. Turn the static chat panel into a mocked Agent workflow.
   - Use deterministic responses first so the editor, diff, apply, undo, and
     persistence behavior can be tested without model variability.
3. Add the first real AI modification path.
   - Start with selected text rewrite because it can map cleanly to existing
     `text.update` operations.
4. Add validated whole-slide replacement only after operation-based edits are
   proven.
   - Whole-slide replacement should go through protocol validation and import
     normalization before it reaches the editor.
5. Decide the product deployment target.
   - This decision should happen early because persistence and Agent runtime
     boundaries depend on it.
