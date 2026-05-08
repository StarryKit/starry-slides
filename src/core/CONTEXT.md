# Core Context

## Purpose

`src/core` owns the internal slide contract and document operations for
`@starrykit/slides`.

Shared roadmap lives in
[ROADMAP.md](/Users/haichao/code/starry-slides/ROADMAP.md).

This module is responsible for:

- parsing manifest-driven generated decks
- reading and validating Contract-compatible slide HTML
- modeling slide documents without replacing HTML as the source of truth
- applying committed slide operations
- preserving undo/redo inversion semantics
- writing edited `htmlSource` back through operation results
- verifying deck packages for the `starry-slides verify` and `starry-slides open`
  paths

## Boundaries

`src/core` must not depend on `src/editor` or `src/node`.

Browser-safe core exports live in `src/core/index.ts`. Node-only verifier code
must stay outside that browser-facing barrel because the editor app imports the
barrel and must not pull server-only dependencies such as `jsdom` into the Vite
browser bundle.

Committed editor edits should flow through core operations rather than direct
feature-local persistence logic.

## Current Implementation Status

- manifest-driven deck import helpers are implemented
- slide document parsing and HTML write-back are implemented
- shared history and operation reducer tests exist under `src/core`
- `verify-deck.ts` validates local deck packages for the CLI
- complete CLI verification includes overflow detection
- complete CLI verification produces a structured verify result with structural
  and overflow issues in one issue list
- static CLI verification skips rendered overflow checks and cannot guarantee
  rendered output is overflow-free
- overflow verification treats slide scroll, editable content overflow, and
  editable bounds outside the slide as errors unless `data-allow-overflow="true"`
  is present on the element or an ancestor

## Terms

Use these terms consistently:

- `slide`
- `slide root`
- `editable element`
- `group`
- `group container`
- `htmlSource`
- `deck package`
- `generated deck`

## Language

**Group**:
An editor-created organization object represented as a specialized block with a
group marker.
_Avoid_: groupId, layer group

**Group Container**:
The DOM element with `data-group="true"` that owns a group's child editable
elements.
_Avoid_: wrapper div, groupId container

**Flatten and Group**:
The grouping behavior that expands selected groups before creating one new
group.
_Avoid_: nested group, group nesting

**Block Flatten**:
The `group.ungroup` operation behavior for a normal Block with direct child
editable elements. It promotes those direct children to the Block's parent layer
and keeps the original Block in place.
_Avoid_: recursive flatten, group conversion

**Block**:
A content object represented by `data-editable="block"`.
_Avoid_: group, wrapper

## Relationships

- A **Block** is a content object.
- A **Group** is an editor organization object.
- A **Group** is a specialized **Block** in the HTML contract and a distinct
  editable type in the parsed editor model.
- A **Group** has exactly one **Group Container**.
- A **Group Container** contains one or more child **editable elements**.
- Child **editable elements** inside a **Group Container** are positioned
  relative to that container.
- A normal **Block** may contain child editable elements without becoming a
  **Group**.
- A normal **Block** with direct child editable elements can be flattened by
  Ungroup without removing the Block itself.
- A normal **Block** without direct child editable elements cannot be ungrouped.
- Starry Slides does not use a flat `groupId` relationship model for grouping.
- **Group** and **Ungroup** are explicit core operations, not opaque batches of
  generic element operations.
- First-version grouping uses **Flatten and Group**, not true nested groups.
- **Flatten and Group** always creates a new group id.
- Group creation is limited to editable elements that share the same parent
  layer.
- Ungroup replaces the **Group Container** in its original parent with child
  editable elements in child DOM order.
- A **Group** is not a visual **Block** and should not expose fill, border,
  shadow, typography, or text styling as group-level content controls.

## Example dialogue

> **Dev:** "Should we store group membership as a `groupId` on each element?"
> **Domain expert:** "No. A Group is a nested DOM container in `htmlSource`; the
> child elements live inside that container."

> **Dev:** "This card is a div with direct editable text inside. Can Ungroup
> split it?"
> **Domain expert:** "Yes, as Block Flatten. Promote the direct editable
> children and keep the original Block in place."

> **Dev:** "Can Group be represented in history as a batch of insert/remove
> operations?"
> **Domain expert:** "No. It can use helpers internally, but history should show
> an explicit Group operation."

> **Dev:** "If I group two existing groups, do we create a nested group?"
> **Domain expert:** "No. First-version grouping flattens selected groups and
> creates one new group."

> **Dev:** "Can the new group reuse one of the old group ids?"
> **Domain expert:** "No. Flatten and Group always creates a new group id."

> **Dev:** "Can I use a Group as a styled card background?"
> **Domain expert:** "No. A Group is organization structure. Insert a normal
> Block if you need a visual container."
