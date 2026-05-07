# ADR-0018: Adopt block flatten through Ungroup

- Status: accepted
- Date: 2026-05-07
- Amends: [ADR-0010](./0010-represent-groups-as-nested-dom-containers.md)

## Context

ADR-0010 separates **Group** from ordinary **Block** content and originally
limited Ungroup to containers marked with `data-group="true"`. That protected
normal content cards from accidental destructive splitting, but it also made an
authored slide block with direct child editable elements hard to flatten when
the author intentionally wants those children on the same editable layer.

The editor already has a user-facing Ungroup command in the Floating Toolbar and
Context Menu. Reusing that command for an intentional single-block flatten keeps
the operation discoverable and avoids adding another one-off command surface.

## Decision

Ungroup remains the user-facing command for removing editor grouping structure,
but it now has two single-selection behaviors:

- For a **Group**, Ungroup keeps the ADR-0010 behavior: remove the group
  container, promote its direct child editable elements to the parent layer, and
  preserve child rendered geometry.
- For a normal **Block** with direct child editable elements, Ungroup performs
  **Block Flatten**: promote the block's direct child editable elements to the
  block's parent layer while keeping the selected block itself in that same
  parent layer.

Block Flatten is one layer at a time. Only the selected block's direct child
editable elements are promoted; any editable descendants nested inside those
children stay nested under them until the user flattens that layer next.

Direct `ul` and `ol` children are treated as block-like structural children
when they contain editable `li` items. Block Flatten promotes the list wrapper
as a single block, assigns it editor identity if needed, and keeps the `li`
items nested inside the list. It must not promote each bullet item individually,
because that would destroy the authored list grouping and allow browser flow to
move the list when preceding siblings leave the block.

Block Flatten must preserve rendered geometry for the block and every promoted
direct child. The block remains selected or participates in the resulting
multi-selection together with the promoted children; child elements must not
shift or resize as a visible side effect of the flatten.

Only direct child editable elements are flattened. Descendant editables inside a
child editable element stay owned by that child, because recursively flattening
authored markup would make one command unexpectedly destructive.

The core operation remains `group.ungroup` for first-version history and undo
compatibility. The operation payload already stores `previousHtmlSource` and
`nextHtmlSource`, so undo and redo remain exact. Implementations may choose a
clearer internal helper name, but the public operation reducer should continue
to apply and invert the existing operation type.

## Implementation Plan

- Update `docs/editing-e2e-coverage-matrix.md` and ADR-0013 so Group/Ungroup
  coverage includes Block Flatten and no longer states that Ungroup is
  unavailable for normal blocks with direct editable children.
- Add E2E coverage in `e2e/tests/context-menu.spec.ts` for selecting a normal
  block with direct child editable elements, invoking Context Menu Ungroup, and
  asserting that the block and promoted child elements become siblings without
  rendered displacement or resizing.
- Update `src/core/slide-operations.ts` so
  `createGroupUngroupOperation(...)` accepts either a group container or a
  normal block with direct editable children. Groups remove the selected
  container; normal blocks keep it.
- Update core unit tests in `src/core/slide-operations.test.ts` for exact
  Block Flatten DOM and coordinate behavior.
- Update `src/editor/index.tsx` so Ungroup availability includes a selected
  normal block with direct editable children, not only parsed group elements.
- Keep block flatten one layer at a time. The selected block's grandchildren
  remain nested after the first flatten and only move on a later flatten of
  the promoted child block.
- Treat direct `ul`/`ol` children with editable `li` descendants as promoted
  block children. The promoted list wrapper receives `data-editable="block"`
  and a stable `data-editor-id`; the `li` items remain nested and keep their
  rendered list geometry and text styles.
- Keep `src/core/slide-document.ts` parsing unchanged: normal blocks remain
  type `block`, and only `data-group="true"` parses as type `group`.

## Verification

- [ ] Context Menu Ungroup flattens a normal block with direct editable children.
- [ ] The selected block remains on the parent layer after flattening.
- [ ] Promoted direct child editable elements become siblings of the block.
- [ ] Direct list wrappers with editable `li` items are promoted as one block,
      and the `li` items do not jump or become separate siblings.
- [ ] The selected block and promoted children keep rendered position and size
      within normal browser tolerance.
- [ ] Nested editable descendants stay nested under their promoted direct
      parent until that layer is flattened next.
- [ ] Group Ungroup still removes `data-group="true"` containers and preserves
      child dimensions.
- [ ] Undo and redo restore exact pre/post flatten DOM.
- [ ] `pnpm test -- src/core/slide-operations.test.ts` passes.
- [ ] The relevant Playwright Context Menu test passes.

## Consequences

Ungroup is now a structural flatten command, not strictly a group-only command.
Future editor work must decide command availability from the selected element's
flattenable direct editable children as well as from group type.

Normal blocks without direct editable children still have Ungroup disabled. This
keeps the command from implying that every content block can be split.

Because Block Flatten keeps the original block, it can leave an empty visual
container after children are promoted. That is intentional: the block itself is
part of the user's authored structure and must not be removed unless the user
explicitly deletes it.

## Alternatives considered

- Add a separate Flatten command. Rejected for now because it duplicates the
  existing Ungroup mental model and adds another command that performs closely
  related structural promotion.
- Treat every normal block with child editables as a Group. Rejected because it
  erases ADR-0010's useful distinction between authored content structure and
  editor-created organization structure.
- Recursively flatten all descendant editable elements. Rejected because it
  would be too destructive for authored HTML structures.
