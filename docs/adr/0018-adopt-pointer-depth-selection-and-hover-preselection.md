# ADR-0018: Adopt pointer-depth selection and hover preselection

- Status: accepted
- Date: 2026-05-07

## Context

The editor renders slide HTML inside an iframe and draws selection chrome in the
React editor layer outside that iframe. This gives the editor stable tooling
chrome, but it also means selected overlays can sit above the iframe and block
normal DOM hit testing when a selected container has editable children.

Nested editable structures are a normal part of the Starry Slides contract.
ADR-0010 keeps groups and ordinary nested blocks as DOM containers, and generated
slides commonly contain a large editable Block with smaller editable Text nodes
inside it. Users need to know which nested element the pointer is currently over
before clicking, and clicking should select the most specific editable target
under the pointer even when a larger parent is already selected.

Without an explicit rule, the interaction becomes ambiguous:

- a selected outer Block can intercept clicks through the editor overlay
- a user cannot see whether a click will select a parent Block or child Text
- future agents may accidentally preserve parent-first behavior while changing
  selection chrome

## Decision

Adopt pointer-depth selection for stage clicks and hover preselection for editable
targets.

Hovering over a visible editable element shows a **preselection overlay** around
the editable target currently under the pointer. The preselection overlay:

- uses the same geometry coordinate system as the normal selection overlay
- visually resembles the selection overlay, but is passive and has no resize,
  rotate, or other manipulation handles
- does not change `selectedElementIds`, toolbar state, history, or text-editing
  state
- is hidden while text editing or direct manipulation is active
- is hidden when there is no editable target under the pointer

Pressing the primary pointer button on a preselected editable target starts the
same move interaction as dragging an already selected element. The pointer-down
gesture selects the preselected target and begins the move session in one
continuous drag; users do not need to click once to select and then drag. This
primary-button drag path must still use pointer-depth hit testing and must not
show resize, rotate, or other manipulation handles before the pointer is down.

Click selection uses the editable target at the current pointer location, not
the previously selected element or the editor overlay that happened to receive
the event. For nested editable elements, the selected target is the deepest
editable descendant under the pointer unless group editing scope constrains the
target. This means a user can select an outer Block, move the pointer over a
nested Text node, see the Text preselection overlay, and click once to select
that Text node without clearing selection first.

Group behavior remains governed by ADR-0010:

- outside group-editing scope, a `data-group="true"` Group remains the selectable
  target for pointer hits inside the Group
- inside group-editing scope, child editable elements inside the active Group
  can be selected directly
- ordinary Blocks that merely contain editable children are not treated as
  Groups and do not force parent selection

## Consequences

Selection routing must share one hit-test helper between iframe click handlers,
editor overlay click handlers, hover preselection, and double-click entry into
text or group editing. The helper must convert editor viewport coordinates to
iframe coordinates when events originate from an outer editor overlay.

Selection overlays must remain usable for moving, resizing, rotating, and context
menus, but overlay clicks that are not manipulation-handle gestures need to
retarget through the iframe before deciding whether to move the existing
selection or select a different nested editable element.

The E2E suite must cover hover preselection and the selected-outer-to-inner
selection path because component visibility alone cannot prove this interaction.

## Alternatives considered

- Keep parent-first selection and require double-click or group scope to reach
  nested children. Rejected because ordinary nested text should be selectable by
  pointer location, and the user cannot predict click outcome without preview
  chrome.
- Use browser `:hover` styles inside the iframe. Rejected because the editor
  needs consistent overlay geometry, E2E-visible state, and behavior while the
  outer React selection overlay is present.
- Make the selection overlay always pointer-events-none. Rejected because the
  same overlay also owns move dragging and context-menu entry points.

## Implementation Plan

- **Affected paths**:
  - `src/editor/hooks/iframe-text-editing-dom.ts`
  - `src/editor/hooks/use-iframe-text-editing.ts`
  - `src/editor/hooks/iframe-text-editing-types.ts`
  - `src/editor/hooks/use-slide-inspector.ts`
  - `src/editor/components/stage-canvas.tsx`
  - `src/editor/index.tsx`
  - `e2e/tests/selection.spec.ts`
  - `docs/e2e.md`
  - `docs/adr/README.md`

- **Pattern**:
  - centralize editable hit testing in the iframe text-editing DOM helper
  - expose preselected element id and rect through editor hooks rather than
    deriving it in the React component
  - render preselection chrome as a passive editor-layer overlay with its own
    `data-testid`
  - retarget selected-overlay mouse down through iframe hit testing before
    starting a move session

- **Tests**:
- E2E hover over nested Text shows a preselection overlay aligned to that Text
- E2E hover does not show manipulation handles
- E2E click from an already selected outer Block onto nested Text selects the
  Text target
- E2E primary-button drag from a preselection overlay moves that editable target
  without requiring a prior click selection

## Verification

- [ ] Hovering a nested editable Text node shows `preselection-overlay` aligned
  with the Text node.
- [ ] Hovering does not render block manipulation handles for the preselected
  element.
- [ ] Selecting an outer Block, then clicking a nested Text node through the
  selected overlay, selects the Text node without clearing selection first.
- [ ] Pressing and dragging from a preselected editable element selects and moves
  that element in the same pointer gesture.
- [ ] Text editing still hides selection and preselection chrome.
- [ ] Existing selection, manipulation, group, and text-editing E2E tests remain
  passing.
