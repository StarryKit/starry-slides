# ADR-0010: Represent groups as nested DOM containers

- Status: accepted
- Date: 2026-05-06
- Amended by: [ADR-0020](./0020-adopt-block-flatten-through-ungroup.md)

## Context

The editor needs Group and Ungroup while preserving the project rule that slide
HTML remains the source of truth. Two models were considered: a nested DOM group
container, or a flat list of editable elements connected by a `groupId`.

## Decision

A **Group** is an editable element represented by a nested DOM container with
`data-group="true"`. Its children remain normal editable elements positioned
relative to the group container. Starry Slides does not use a flat `groupId`
relationship model for grouping.

In the HTML contract, a Group is represented as a specialized Block:

```html
<div data-editable="block" data-group="true">
  <div data-editable="block"></div>
  <p data-editable="text"></p>
</div>
```

The editor model still treats it as a distinct editable type because its
interaction semantics differ from an ordinary Block. A normal Block may contain
child editable elements without becoming a Group. ADR-0020 amends the original
Ungroup boundary: containers explicitly marked with `data-group="true"` are
removed by Ungroup, while normal Blocks with direct child editable elements can
be flattened by Ungroup without removing the Block itself.

### Group editing interaction

Single-clicking a Group selects the Group container. Double-clicking a Group
enters a **Group Editing Scope**, where selection is constrained to child
editable elements inside that Group. Escape exits text editing first when text
editing is active; otherwise Escape exits the Group Editing Scope and returns
selection to the Group.

While a Group Editing Scope is active, the editor should de-emphasize slide
content outside the active Group with a blur/transparent focus overlay. The
overlay is a visual cue, not a modal state.

### Group operations

Group and Ungroup are explicit core operations, not opaque batches of generic
element operations.

- `group.create` creates a group container, moves selected child editable
  elements into it, converts child coordinates to group-relative coordinates,
  and records enough structure to undo the change as one user-level history
  step.
- `group.ungroup` removes a group container, promotes child editable elements to
  the parent layer, converts child coordinates back to parent coordinates, and
  records enough structure to undo the change as one user-level history step.

The implementation may use shared lower-level DOM helpers internally, but the
operation schema and history should preserve Group/Ungroup as domain-level
operations.

First-version grouping does not support true nested groups. If the selection
contains existing Groups, grouping performs **Flatten and Group**: selected
Groups are expanded, their child editable elements participate in the new
Group, and old nested group containers are removed from the forward document
state.

Flatten and Group always creates a new group id. It does not preserve or reuse
ids from selected Groups, even when the selection contains exactly one existing
Group.

Group creation is allowed only for editable elements that share the same parent
layer. Cross-parent grouping is disabled in the first version because DOM
insertion order, coordinate conversion, and stacking semantics become
ambiguous.

Ungroup replaces the group container in its original parent with the group's
child editable elements, preserving child DOM order and converting child
coordinates back to the parent coordinate space. ADR-0020 defines the related
normal Block flatten behavior for authored Blocks that contain direct editable
children.

### Resize behavior

First-version Group and multi-selection resize uses geometry scaling only:

- scale child element positions relative to the selection or group bounds
- scale child element boxes such as width and height
- do not scale font size, line height, letter spacing, padding, gap, border
  radius, shadows, or other decorative visual properties

If this first version does not produce acceptable slide editing results, full
visual scaling can be considered as a separate follow-up decision.

### Group visual editing

A Group is an editor organization object, not a visual Block. First-version
Group selection should expose grouping, layout, layer, alignment, distribution,
and resize commands, but not content styling controls such as fill, border,
shadow, typography, or text attributes. If the user needs a visual container,
they should insert and style a normal Block.

## Consequences

Group structure is directly visible in `htmlSource`, and moving a group can move
the container while preserving child-relative positions. Group and Ungroup
operations must update the DOM structure, convert child coordinates correctly,
and keep undo/redo as single user-level history steps.

The Block/Group distinction still prevents normal Blocks from being treated as
Groups. ADR-0020 allows an intentional flatten of direct child editable elements
from a normal Block, but keeps the Block itself and does not recursively split
arbitrary authored content.

Because Groups are not visual Blocks, editor tooling should not encourage using
Group containers as designed card/frame objects.
