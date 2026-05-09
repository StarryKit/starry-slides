# ADR-0024: Adopt marquee selection for stage elements

- Status: accepted
- Date: 2026-05-09

## Context

The editor already supports single selection, shift-click multi-selection,
pointer-depth hover preselection, and direct object manipulation across the slide
iframe and the React editor chrome. Users also need a faster way to select
multiple objects by dragging a rectangular selection area on the slide.

The slide content is rendered inside an iframe while selection chrome is rendered
outside that iframe. A marquee interaction therefore has to share the stage
coordinate system used by selection and manipulation overlays, and it must not
fight existing element drag gestures that begin on editable elements.

Browser-native text selection is a related failure mode: dragging across slide
text can leave blue selected text in the iframe or parent document even though
the user intended an object-level editing gesture.

## Decision

Adopt stage-level marquee selection for object editing.

Pressing the primary pointer button on non-editable slide background and dragging
past a small threshold starts a marquee session. The editor renders the marquee
rectangle in the React overlay layer and, on pointer release, selects every
editable element whose rendered bounds intersect the rectangle. Full containment
is not required.

Marquee selection follows the same scope rules as pointer-depth selection:

- outside group-editing scope, grouped elements select the group target rather
  than individual descendants
- inside group-editing scope, editable descendants of the active group can be
  selected directly
- when both a container and its editable descendants are touched, the outer
  touched container wins so the user selects the whole nested object rather than
  only its inner text or child blocks

Starting on an editable element remains reserved for click selection and direct
drag/move. Starting on slide background starts marquee selection. Shift, Meta, or
Control preserves the current selection and adds touched targets; a plain marquee
replaces the current selection.

During object editing, the iframe disables native text selection. Native text
selection is re-enabled only for the active `contenteditable` text-editing
session.

## Consequences

The editor needs a dedicated marquee-selection hook because iframe document
events, parent-window mouse moves, and React overlay rendering all participate in
one gesture. The hook must clean up iframe and parent listeners on mouseup,
Escape, slide switch, and unmount.

Object-level pointer gestures should clear any browser selection ranges so the
blue native selection state does not remain visible after drag gestures.

Future selection changes should preserve the distinction between starting a
gesture on editable content, which selects or moves that element, and starting on
background, which draws a marquee.

## Alternatives considered

- Require shift-click for all multi-selection. Rejected because it is slow for
  selecting spatial clusters of elements.
- Start marquee selection even when the pointer begins on an editable element.
  Rejected because it would conflict with existing direct move behavior from
  ADR-0018.
- Require full containment. Rejected because the target behavior is touch-to-
  select, and partial intersection better matches graphics-editor expectations.
- Leave browser text selection enabled and clear it after mouseup only. Rejected
  because the blue selection flash is visible during the drag and can make the
  editor feel broken.

## Implementation Plan

- **Affected paths**:
  - `src/editor/hooks/use-marquee-selection.ts`
  - `src/editor/hooks/use-iframe-text-editing.ts`
  - `src/editor/hooks/iframe-text-editing-dom.ts`
  - `src/editor/components/stage-canvas.tsx`
  - `src/editor/components/editor-workspace.tsx`
  - `src/editor/index.tsx`
  - `e2e/tests/selection.spec.ts`
  - `docs/e2e.md`
  - `docs/adr/README.md`

- **Pattern**:
  - keep iframe hit testing and scope filtering in the iframe DOM helper layer
  - render marquee chrome in the editor layer with `StageRect` coordinates
  - compute selected targets from rendered bounding boxes and rectangle
    intersection
  - keep direct element drag gestures owned by block manipulation
  - disable native iframe text selection in object-editing mode and re-enable it
    only while a text node is actively editable

- **Tests**:
  - E2E drag marquee from slide background selects every touched editable target
  - E2E partial intersection is enough to include a target
  - E2E nested editable structures select the outer touched container, not only
    the innermost descendants
  - E2E untouched targets are excluded
  - E2E marquee drag leaves no native browser text selection in either the parent
    window or slide iframe
  - Existing selection, manipulation, and text-editing E2E tests remain passing

## Verification

- [ ] Dragging a marquee rectangle from slide background shows
      `marquee-selection-overlay`.
- [ ] Releasing the marquee selects all touched editable targets, including
      partially intersected targets.
- [ ] When a marquee touches a nested editable structure, the outer touched
      editable container is selected instead of only the innermost descendants.
- [ ] Untouched editable targets are not selected.
- [ ] Shift, Meta, or Control marquee adds to the current selection.
- [ ] Direct drag from an editable element still moves that element rather than
      starting marquee selection.
- [ ] Drag gestures do not leave native blue text selection in the parent page or
      iframe.
- [ ] Active text editing still allows native text selection inside the editable
      text node.
