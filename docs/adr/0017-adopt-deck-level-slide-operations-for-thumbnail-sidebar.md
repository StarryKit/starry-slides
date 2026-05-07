# ADR-0017: Adopt deck-level slide operations for the thumbnail sidebar

- Status: proposed
- Date: 2026-05-07

## Context

The editor sidebar has been restyled as a fixed thumbnail list with controls for
adding slides, duplicating slides, deleting slides, hiding slides, and drag
reordering. Those UI affordances now need to become real deck-level behavior.

The current editor operation pipeline is element-scoped:

- `src/core/slide-operation-types.ts` defines operations inside a single slide.
- `src/core/slide-operation-reducer.ts` applies operations by matching
  `slideId`.
- `src/core/history.ts` maps those operations over an existing slide array.
- `src/editor/hooks/use-slide-history.ts` owns active slide selection, undo, and
  redo for element changes.
- `src/editor/app/use-slides-data.ts` saves edited slide HTML back to existing
  manifest files.

That model is not enough for sidebar-level actions because those actions change
the deck as a collection. They need to create, remove, reorder, and mark slides
in ways that must survive save/reload and stay compatible with the deck
manifest.

Related constraints:

- ADR-0001 keeps editing as explicit operations with local history.
- ADR-0007 limits generated deck copies and favors editing the active deck
  package in place.
- ADR-0011 makes the CLI/deck package contract agent-facing.
- ADR-0015 keeps editor chrome compact and neutral; the new sidebar UI follows
  that visual direction.

## Decision

Adopt deck-level slide operations and wire the sidebar controls through those
operations.

Deck-level operations will live alongside element operations but operate on the
slide collection:

- `slide.create`
- `slide.duplicate`
- `slide.delete`
- `slide.reorder`
- `slide.visibility.update`

The operation model must keep these concerns explicit:

1. **Collection order**: the slide array order is the source of editor ordering.
2. **Manifest persistence**: save/reload must preserve order and visibility.
3. **Source files**: newly created or duplicated slides need deterministic
   `sourceFile` assignment before save.
4. **Undo/redo**: deck-level actions must use the same local history surface as
   element edits.
5. **Active slide behavior**: deleting, duplicating, or reordering slides must
   leave `activeSlideId` pointing at a valid slide.

The first sidebar behavior contract is:

1. **Add slide** creates a blank slide immediately after the currently selected
   slide, selects the new slide, gives it a deterministic `sourceFile`, and
   persists a new manifest entry.
2. **Duplicate slide** creates a copy immediately after the source slide,
   selects the duplicate, preserves the source slide title and HTML, gives the
   duplicate a unique `id` and `sourceFile`, and persists it.
3. **Delete slide** removes the slide from editor state and the saved manifest.
   When the deleted slide is active, selection moves to the next slide if one
   exists, otherwise the previous slide. Deleting the last remaining slide is
   disabled.
4. **Hide slide** toggles `SlideModel.hidden` and
   `manifest.slides[].hidden`. Hidden slides stay visible/editable in the
   sidebar and stage, but render dimmed in the sidebar with an `EyeOff` marker.
5. **Drag reorder** changes slide order by dragging a sidebar thumbnail/grip and
   persists the new manifest order.

Slide visibility will be stored as manifest metadata, not only in memory. The
manifest entry should grow an optional `hidden?: boolean` field, and
`SlideModel` should expose the same optional flag after import. Hidden slides
remain editable in the editor unless a later ADR decides otherwise; the first
meaningful behavior is that presentation/export paths can skip hidden slides
when they use the deck presentation order.

Drag reordering should be implemented as a normal operation that records the
previous and next index. The sidebar grip remains only a UI handle until that
operation exists.

## Implementation Plan

- **Affected paths**:
  - `src/core/slide-contract.ts`
  - `src/core/slide-operation-types.ts`
  - `src/core/slide-operation-reducer.ts`
  - `src/core/history.ts`
  - `src/core/generated-deck.ts`
  - `src/core/verify-deck.ts`
  - `src/editor/hooks/use-slide-history.ts`
  - `src/editor/components/slide-sidebar.tsx`
  - `src/editor/app/use-slides-data.ts`
  - `vite.config.ts`
  - `src/runtime/view-renderer.ts`
  - `src/cli/index.ts`
  - relevant unit and e2e tests under `src/**.test.ts` and `e2e/tests/`

- **Operation shape**:
  - add a deck operation union separate from atomic slide-element operations
  - update history reduction to apply either element operations or deck
    operations
  - keep element operations targeted by `slideId`
  - keep deck operations targeted at the collection and do not overload
    `slideId`

- **Persistence pattern**:
  - preserve existing `sourceFile` values for loaded slides
  - generate deterministic files for new slides, for example under
    `slides/<next-number>-untitled.html`
  - when duplicating a slide, copy `htmlSource`, assign a new `id`, assign a new
    `sourceFile`, and preserve the title unless the UI later asks to rename it
  - extend editor save payloads so the server can update both slide files and
    `manifest.json`
  - keep missing or legacy `hidden` values equivalent to `false`

- **Sidebar wiring**:
  - `onAdd` dispatches `slide.create` at `activeSlideIndex + 1`
  - `onDuplicate` dispatches `slide.duplicate` at `sourceSlideIndex + 1`
  - `onDelete` dispatches `slide.delete` and moves active selection to the next
    valid slide
  - `onToggleHidden` dispatches `slide.visibility.update`
  - thumbnail/grip drag-and-drop dispatches `slide.reorder`
  - destructive delete should be disabled or guarded when only one slide remains

- **Tests**:
  - core tests cover create, duplicate, delete, reorder, visibility, undo, and
    redo
  - generated deck tests cover manifest import/export of `hidden`
  - editor tests cover sidebar add, duplicate, delete, hide/show, reorder,
    active slide fallback after delete, scroll-to-active behavior, and manifest
    persistence after reload
  - runtime/CLI tests cover presentation/export behavior for hidden slides once
    those consumers adopt visibility semantics

## Verification

- [ ] Adding a slide after the active slide creates a new `SlideModel`, selects
      it, assigns a deterministic `sourceFile`, and saves a manifest entry.
- [ ] Duplicating a slide creates a new slide with copied HTML, unique editor
      `id`, and a unique `sourceFile` immediately after the source slide.
- [ ] Deleting a slide removes it from editor state and from the saved
      manifest, while leaving at least one active slide.
- [ ] Reordering slides through sidebar drag updates editor order, saved
      manifest order, and undo/redo state.
- [ ] Toggling hidden updates `SlideModel.hidden` and `manifest.slides[].hidden`.
- [ ] Hidden slides are dimmed in the sidebar and can be shown again from the
      same menu.
- [ ] Legacy manifests without `hidden` continue to load as visible slides.
- [ ] `pnpm lint`, `pnpm test`, `pnpm build`, and relevant e2e tests pass after
      implementation.

## Consequences

The sidebar UI becomes a real deck editing surface, not only visual chrome.

The history reducer becomes responsible for both element-level and deck-level
operations. That raises the importance of keeping operation types explicit and
well tested.

Saving can no longer treat the manifest as immutable once these operations
exist. The editor save endpoint must update `manifest.json` as well as slide
HTML files.

Presentation and export paths gain a shared visibility concept, but hidden-slide
semantics should be adopted deliberately by each consumer instead of being
silently inferred in unrelated code.

## Alternatives considered

### Keep sidebar actions as local React state

Rejected. Local-only state would not survive save/reload, would not fit the
existing undo/redo model, and would make future CLI/runtime behavior diverge
from the editor.

### Implement each sidebar action directly in `SlidesEditor`

Rejected. Direct array mutation inside the editor would bypass the operation
pipeline established by ADR-0001 and would make tests harder to share across
core, editor, and runtime consumers.

### Store hidden slides only in slide HTML

Rejected. Visibility is deck metadata, not slide content. Putting it only in the
HTML would make ordering/export decisions parse every slide file and would blur
the boundary between generated slide content and deck presentation metadata.

### Delay the UI until every capability exists

Rejected. The product can adopt the target sidebar chrome first. The inactive
controls are acceptable while the ADR records the implementation contract for
the missing behavior.
