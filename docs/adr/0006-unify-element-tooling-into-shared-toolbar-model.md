# ADR-0006: Unify element tooling into a shared toolbar model

- Status: accepted
- Date: 2026-05-05

## Context

The editor currently has two separate element-editing surfaces:

- `FloatingToolbar` in `packages/editor/src/components/floating-toolbar.tsx`
- `SidebarToolPanel` in `packages/editor/src/components/sidebar-tool-panel.tsx`

These surfaces edit the same selected element, but their feature sets and
organization have drifted apart:

- the floating toolbar is optimized for quick typography, alignment, layer, and
  delete actions
- the tool panel is optimized for broader style fields, attributes, custom CSS,
  and advanced controls

The right inspector also previously contained an `Edit / Chat` tab split. Chat
was static scaffold UI rather than an active editing workflow and has been
removed from the codebase. The right side should now be an editing tool surface,
not a chat surface.

The product direction is to make the floating toolbar and the tool panel two
forms of the same editor tool. A user selecting an element should be able to
switch between these forms. The two forms must not be visible at the same time.

The intended hierarchy has been confirmed and is captured directly in this ADR
as the implementation decision.

## Decision

Adopt one shared element-tooling feature model and render it in two mutually
exclusive forms:

1. Floating Toolbar mode
2. Tool Panel mode

Both forms implement the same feature hierarchy. They differ only in layout and
interaction mechanics.

### Shared Feature Hierarchy

The shared hierarchy is ordered. Implementation order and UI order should follow
the document order from front to back, top to bottom, and left to right.

- Typography
  - Font
    - Font family
    - Font size
    - Bold
    - Italic
    - Underline
    - Strikethrough
  - Paragraph
    - Line height
    - Text align

- Appearance
  - Fill
    - Text color
    - Background color
  - Border
    - Border
    - Border radius
    - Shadow

- Layout
  - Size
    - Width
    - Height
  - Visibility
    - Opacity
  - Layer and Alignment
    - Align selected element to slide bounds
    - Layer order

- Misc
  - State
    - Lock / unlock
  - Link
    - Link URL

- Others
  - Text alternatives
    - Alt text
  - Labels
    - ARIA label
  - CSS
    - Custom CSS property

Features not listed here are not part of the shared target model.

### Rendering Rules

Floating Toolbar mode:

- render each top-level feature group as a toolbar section
- render each second-level group as a toolbar button
- render the concrete features for that second-level group inside the button's
  dropdown panel
- if a second-level group has exactly one feature, it may be rendered as a
  direct button when that is clearer, such as `Misc > State > Lock / unlock`

Tool Panel mode:

- render each top-level feature group as a collapsible group
- render each second-level group as a panel inside that group
- render concrete feature controls inside the corresponding panel

The two modes are mutually exclusive:

- when Floating Toolbar mode is active, the floating toolbar is shown and the
  right tool panel is hidden
- when Tool Panel mode is active, the right tool panel is shown and the floating
  toolbar is hidden
- mode switching is available only when an editable element is selected
- text-editing state, dragging, resizing, and rotation may continue to suppress
  tool UI as they do today

### Shared Operations

The shared model should be data-driven enough that both UI forms consume the
same feature definitions and action handlers. The model should describe:

- group id and label
- subgroup id and label
- feature id and label
- control type
- style or attribute target
- value parsing and normalization rules
- enabled/disabled state
- commit behavior

Style and attribute writes continue to go through the existing editor commit
pipeline in `packages/editor/src/index.tsx`, preserving ADR-0001's history and
write-back strategy.

## Consequences

Benefits:

- both edit modes expose the same capabilities
- future additions go through one shared feature model instead of duplicating
  logic in two components
- the right side of the editor becomes a focused tool surface after Chat removal
- users can choose between a compact contextual workflow and a more complete
  side-panel workflow without losing functionality

Costs:

- this is a real refactor of the editor UI surface, not a small restyle
- existing floating toolbar and tool panel components must be decomposed so
  shared controls and operations are not copied twice
- E2E tests that assume the old grouping or old floating toolbar button labels
  will need updates

Risks:

- trying to make every advanced control fit directly into the toolbar row could
  make the floating toolbar too wide; advanced controls should live in dropdown
  panels
- if the feature model is too abstract, simple controls may become harder to
  maintain; keep the model focused on current feature needs
- keyboard focus and outside-click behavior must remain reliable across nested
  dropdown panels and side-panel controls

## Alternatives considered

### Keep separate feature sets

Rejected. This preserves the current drift: some capabilities exist only in the
floating toolbar and others only in the tool panel.

### Make the tool panel the only full editor

Rejected. The floating toolbar is valuable as the compact contextual editing
form. Removing or weakening it would make quick edits slower.

### Duplicate missing controls into both components manually

Rejected. This solves immediate parity but creates two places to update for
every future feature.

### Keep Chat as a third right-side tab

Rejected. Chat was scaffold UI and is outside the current element tooling
model. It should not compete with editor controls in the right sidebar.

## Non-goals

This ADR does not:

- define a live AI/chat workflow
- restore the removed Chat panel
- add click action type, target slide, copy, delete, display hide/show, or other
  features that are not in the shared target hierarchy
- change slide document semantics, history semantics, or write-back operations
- require generated slide HTML inside the iframe to change
- decide final icon choices for every toolbar button beyond preserving clear
  labels and accessible names

## Implementation Plan

Implementation should be phased. Do not rewrite both tool surfaces in one large
patch.

### Phase 1: Introduce the shared feature model

Affected paths:

- `packages/editor/src/lib/style-controls.ts`
- new module under `packages/editor/src/lib/` or
  `packages/editor/src/components/`, such as `element-tool-model.ts`
- `packages/editor/src/index.tsx`
- `packages/editor/src/components/floating-toolbar.tsx`
- `packages/editor/src/components/sidebar-tool-panel.tsx`

Tasks:

- Create a shared element tool model that encodes the accepted hierarchy:
  top-level groups, second-level groups, features, labels, control types, and
  style/attribute targets.
- Move duplicated style value parsing into shared helpers where useful:
  font size, font weight, text decoration lines, color values, numeric slider
  values, and select value normalization.
- Keep feature definitions concrete. Avoid a generic form engine that hides
  editor behavior behind unclear abstractions.
- Keep `commitStyleChange` and `commitAttributeChange` in
  `packages/editor/src/index.tsx` as the write boundary.

### Phase 2: Add editor tool mode state

Affected paths:

- `packages/editor/src/index.tsx`
- `packages/editor/src/components/stage-canvas.tsx`
- `packages/editor/src/components/editor-header.tsx` if the mode switch needs a
  header-level fallback

Tasks:

- Add state for the active element tool mode, with values `floating` and
  `panel`.
- Only show one surface at a time:
  - `floating`: render `FloatingToolbar`, hide `SidebarToolPanel`
  - `panel`: render `SidebarToolPanel`, hide `FloatingToolbar`
- Only expose mode switching while an editable element is selected.
- Preserve existing suppression rules while editing text or manipulating a
  selection.
- Decide the concrete switch placement during implementation, but it must be
  reachable from the active editing surface. If the active surface is hidden by
  the selected mode, provide a small stable control in the editor chrome so the
  user is not trapped in one mode.

### Phase 3: Refactor Floating Toolbar to consume the model

Affected paths:

- `packages/editor/src/components/floating-toolbar.tsx`
- shared subcomponents extracted from the current file if needed

Tasks:

- Render toolbar sections from the top-level groups.
- Render toolbar buttons from the second-level groups.
- Render dropdown panels from the concrete feature controls.
- Add missing target controls currently absent from the floating toolbar:
  line height, background color, border, border radius, shadow, width, height,
  opacity, lock/unlock, link URL, alt text, ARIA label, and custom CSS.
- Preserve existing floating toolbar capabilities that remain in the target
  model: typography, text decoration, text align, align-to-slide, and layer
  order.
- Remove floating toolbar controls that are not in the target model, such as
  delete, unless the target hierarchy is later updated to include them.

### Phase 4: Refactor Tool Panel to consume the model

Affected paths:

- `packages/editor/src/components/sidebar-tool-panel.tsx`
- shared field/control components extracted from the current file if needed

Tasks:

- Render collapsible groups from the top-level groups.
- Render panels from the second-level groups.
- Render concrete controls from the shared feature definitions.
- Add missing target controls currently absent from the tool panel:
  italic, underline, strikethrough, align-to-slide controls, and layer order.
- Remove or hide controls not in the target model:
  display hide/show, click action type, target slide, copy, and delete unless
  the target hierarchy is later updated to include them.
- Keep `Misc > State` as a direct button because it has one feature.

### Phase 5: Clean up tests and documentation

Affected paths:

- `tests/e2e/text-editing.spec.ts`
- `DESIGN.md` if component inventories need to mention the new model
- `ROADMAP.md` if old chat/tooling roadmap references become misleading

Tasks:

- Update E2E tests to verify feature parity through both modes.
- Add coverage for switching modes and ensuring the two surfaces are not visible
  at the same time.
- Add tests for newly shared controls in the floating toolbar and tool panel.
- Treat this ADR as the implementation authority for the shared feature model.

## Verification

- `pnpm lint` passes.
- `pnpm --filter @starry-slides/core build` passes when editor build needs core
  declarations.
- `pnpm --filter @starry-slides/editor build` passes.
- E2E coverage confirms:
  - selecting an editable element exposes a mode switch
  - Floating Toolbar mode shows the floating toolbar and hides the tool panel
  - Tool Panel mode shows the tool panel and hides the floating toolbar
  - both modes expose the shared target hierarchy
  - a representative style change from each top-level group commits through
    history and updates the slide HTML
  - Chat UI is not present in the right sidebar

## ADR Review

Passes:

- context is self-contained and names the current affected components
- decision defines the shared hierarchy and how each UI form maps to it
- non-goals prevent reintroducing Chat or unrelated actions during the refactor
- implementation plan names affected paths, phases, and verification criteria

Gaps found:

- none that block implementation

Recommendation: Ship it.
