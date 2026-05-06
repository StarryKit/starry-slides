# ADR-0013: Adopt editing E2E coverage contract

- Status: proposed
- Date: 2026-05-06

## Context

The editor has enough interaction surface that unit tests alone no longer prove
release readiness. Recent ADR-0009 work exposed gaps between what the product
promises and what the E2E suite actually verifies: several tests assert that
controls are visible, but not that the corresponding edit operation commits,
writes back to slide HTML, updates selection state, and participates correctly
in undo/redo.

For editing features, "100% E2E coverage" does not mean line coverage. It means
every supported user-facing edit path has at least one browser-level test for
the complete behavior contract:

- the entry point is present in the correct surface
- the command can be invoked by the intended user gesture
- the slide DOM changes as expected
- the editor model and persisted HTML remain consistent
- selection/focus/tooling state updates correctly
- undo and redo restore exact prior and next states when the command is
  undoable
- invalid or irrelevant states do not expose or execute the command

This ADR complements ADR-0001's editing pipeline, ADR-0009's command surface
split, and ADR-0010's group model. It does not replace unit tests for core
operation reducers or HTML transformation helpers.

## Decision

Adopt an editing E2E coverage contract for all editor-facing mutation features.
New editing work is not complete until its E2E coverage proves the contract
across the surfaces that expose the feature.

The E2E suite must cover editing behavior by capability, not just by component.
If a command is exposed through multiple surfaces, each surface needs an E2E
entry-path test, and at least one shared behavior assertion must prove all paths
reach the same operation semantics.

### Required coverage by editing feature group

E2E coverage must be organized by editing feature group first. UI surface is a
property of each feature group, not the top-level category. A coverage matrix
must record, for every supported command, the feature group, invocation
surfaces, fixture, expected DOM/model effect, selection/focus effect, history
expectation, persistence expectation, current test file, and remaining gaps.

#### Selection, focus, and edit-mode routing

Required behavior coverage:

- selecting text, block, nested text, group, and multi-selection targets
- clearing selection from the stage background
- entering and leaving text editing by double-click, Enter, Escape, blur, and
  outside click where supported
- toolbar and manipulation chrome visibility across selected, dragging,
  resizing, rotating, text-editing, and group-editing states
- commands being unavailable when text editing should use native browser
  behavior
- selection and command behavior after switching slides

Invocation surfaces:

- stage click, double-click, background click, keyboard Enter/Escape, blur, and
  slide switching

Current coverage is partially present in:

- `e2e/tests/selection.spec.ts`
- `e2e/tests/editor-chrome.spec.ts`
- `e2e/tests/text-editing.spec.ts`
- `e2e/tests/text-editing-history.spec.ts`
- `e2e/tests/block-manipulation.spec.ts`

Known gaps:

- selection and command behavior after switching slides is thinly covered
- toolbar suppression during rotation is not explicitly covered
- command unavailability during native text editing is not consistently covered
  for all shortcut and toolbar paths

#### Text content editing and native text clipboard

Required behavior coverage:

- text edits commit to the slide DOM, editor model, and persisted generated HTML
- undo and redo restore exact previous and next text states
- text-editing Cut, Copy, and Paste operate inside the active text element
- text-editing Cut, Copy, and Paste do not mutate object selection or Object
  Clipboard state
- keyboard shortcuts that are native while editing text do not invoke object
  commands

Invocation surfaces:

- contenteditable/native browser text editing, keyboard shortcuts, blur, and
  explicit edit-mode exit gestures

Current coverage is partially present in:

- `e2e/tests/text-editing.spec.ts`
- `e2e/tests/text-editing-history.spec.ts`
- `e2e/tests/selection.spec.ts`

Known gaps:

- text-editing Cut, Copy, and Paste isolation from Object Clipboard is not
  explicitly covered
- native text clipboard isolation is not explicitly covered
- text refresh/persistence coverage is stronger than other feature groups, but
  still needs to stay represented in the coverage matrix

#### Text typography and paragraph formatting

Required behavior coverage:

- font family, font size, font weight, italic style, underline, strikethrough,
  line height, text alignment, and text color
- each formatting change writes the expected inline style or HTML attribute
- each undoable formatting change participates in undo and redo
- representative formatting changes persist after refresh or reopen

Invocation surfaces:

- Floating Toolbar typography controls and any secondary surface that exposes
  the same formatting command

Current coverage is partially present in:

- `e2e/tests/floating-toolbar.spec.ts`

Known gaps:

- underline and strikethrough are not covered
- text color is not covered separately from background color
- formatting persistence after refresh is not consistently covered

#### Object appearance, attributes, and custom CSS

Required behavior coverage:

- background color, border, border radius, box shadow, opacity, lock state,
  link URL, alt text, ARIA label, and custom CSS property add/update/remove
  behavior
- each appearance or attribute change writes the expected generated HTML source
  state when persisted
- each undoable appearance or attribute change participates in undo and redo
- invalid values are rejected, normalized, disabled, or no-op according to the
  product contract

Invocation surfaces:

- Floating Toolbar appearance, attribute, and custom CSS controls

Current coverage is partially present in:

- `e2e/tests/floating-toolbar.spec.ts`

Known gaps:

- box shadow is not covered
- lock state, link URL, alt text, and ARIA label are not covered
- custom CSS removal or overwriting an existing custom property is not covered
- style and attribute edits are not consistently verified after refresh

#### Layout, transform, and direct manipulation

Required behavior coverage:

- width, height, opacity, and rotation mutations
- clearing rotation while preserving existing translate
- drag, resize, and rotate manipulation handles
- snap guide behavior during drag and resize where supported
- arrow-key movement with normal, Shift, and Alt step sizes
- layout and transform operations participate in undo and redo

Invocation surfaces:

- Floating Toolbar layout controls, manipulation handles, and keyboard movement
  shortcuts

Current coverage is partially present in:

- `e2e/tests/floating-toolbar.spec.ts`
- `e2e/tests/keyboard-and-multiselect.spec.ts`
- `e2e/tests/block-manipulation.spec.ts`

Known gaps:

- rotation is covered only for setting a non-zero value; clearing rotation and
  preserving existing translate are not covered
- rotate handle behavior is not covered by E2E
- Alt-step keyboard movement is not covered
- redo coverage is stronger for text edits than for object/layout operations

#### Layering, alignment, and distribution

Required behavior coverage:

- bring to front, bring forward, send backward, and send to back
- align to slide left, horizontal center, right, top, vertical center, and
  bottom
- horizontal and vertical distribution for three or more selected elements
- keyboard layer shortcuts
- commands are hidden, disabled, or no-op in irrelevant states
- operation effects are asserted on rendered position/order, not just menu
  visibility

Invocation surfaces:

- Floating Toolbar arrangement controls, Context Menu arrangement commands, and
  keyboard layer shortcuts

Current coverage is partially present in:

- `e2e/tests/floating-toolbar.spec.ts`
- `e2e/tests/keyboard-and-multiselect.spec.ts`
- `e2e/tests/block-manipulation.spec.ts`

Known gaps:

- Floating Toolbar layer, align, and distribute commands are mostly tested for
  visibility, not effect
- Context Menu Layer, Align, and Distribute behavior is not covered
- arrangement persistence after refresh is not covered

#### Grouping, ungrouping, and nested-group flattening

Required behavior coverage:

- group and ungroup selected elements
- disabled or absent Ungroup behavior for a normal block
- group-specific selection, focus, toolbar, and manipulation state
- group-specific layout and rotation operations where supported
- Group then Ungroup on slide 12's Snap sibling fixture: after grouping Card A
  and Card B, then ungrouping, each promoted card must return to the parent
  layer with the same rendered bounding-box width and height it had before
  grouping, within normal browser subpixel tolerance
- Flatten and Group on slide 12's Snap sibling fixture: after creating two
  separate groups and grouping those groups into a new group, the cards inside
  the resulting group must keep their pre-flatten rendered bounding-box width
  and height, within normal browser subpixel tolerance
- grouping and ungrouping participate in undo, redo, and persistence

Invocation surfaces:

- Floating Toolbar group controls and Context Menu Group/Ungroup commands

Current coverage is partially present in:

- `e2e/tests/floating-toolbar.spec.ts`
- `e2e/tests/keyboard-and-multiselect.spec.ts`
- `e2e/tests/block-manipulation.spec.ts`

Known gaps:

- Floating Toolbar ungroup is not covered as an invoked operation
- Context Menu Group and Ungroup behavior is not covered
- Group then Ungroup does not yet have an E2E assertion that child cards keep
  their rendered dimensions after being promoted back to the parent layer
- Flatten and Group does not yet have an E2E assertion that card dimensions are
  preserved when selected groups are expanded into the new group
- group rotation or group-specific layout operations are not covered
- grouping and ungrouping persistence after refresh is not covered

#### Duplicate, remove, and Object Clipboard

Required behavior coverage:

- Duplicate creates new element ids, preserves expected geometry, and selects
  the duplicate
- Delete and Backspace remove selected objects and undo restores them
- object Copy does not write to the system clipboard
- object Paste uses the editor-local Object Clipboard
- object Cut is undoable as copy plus remove
- object Paste creates new element ids and preserves multi-selection relative
  positions
- object Paste selects the inserted objects
- object Paste with an empty Object Clipboard is a no-op
- repeated paste offset and clamping inside slide bounds
- operation batches, such as multi-select delete or paste, undo as one user
  action

Invocation surfaces:

- keyboard shortcuts and Context Menu Duplicate/Delete where available

Current coverage is partially present in:

- `e2e/tests/keyboard-and-multiselect.spec.ts`
- `e2e/tests/text-editing.spec.ts`

Known gaps:

- Duplicate shortcut is not directly covered
- Delete key and Backspace are not both covered across platforms
- Context Menu Duplicate and Delete behavior is not covered
- empty Object Clipboard paste no-op is not covered
- new id assertions for pasted nested editable children are not explicit
- object clipboard persistence after refresh is not covered

#### Cross-surface command parity

Required behavior coverage:

- every command exposed through multiple surfaces has one invocation test per
  surface
- all invocation paths for the same command reach the same operation semantics
- opening the Context Menu works from a selected element and multi-selection
- Context Menu commands have visibility and behavior coverage for Duplicate,
  Delete, Group, Ungroup, Layer, Align, and Distribute
- keyboard navigation and dismissal behavior provided by the Radix/shadcn
  primitive is covered where product-critical
- irrelevant states hide, disable, or no-op commands consistently across
  Floating Toolbar, Context Menu, keyboard, and direct-manipulation surfaces

Current coverage:

- no dedicated Context Menu E2E coverage exists.

Known gaps:

- all Context Menu behavior listed above is missing
- keyboard commands after group selection are thinly covered
- shared behavior assertions proving surface parity are not consistently present

### Coverage acceptance rules

An editing feature is considered E2E-covered only when:

- each supported surface has an invocation test
- at least one test verifies the actual DOM/model effect
- undo and redo are covered for undoable mutations
- irrelevant states hide, disable, or no-op the command as designed
- tests use stable user-facing selectors or `data-testid` hooks, not fragile CSS
  structure
- the test name states the user behavior and expected result

Visibility-only tests are allowed for chrome presence, but they do not count as
operation coverage.

## Implementation Plan

1. Create an E2E coverage matrix document or checklist organized by the editing
   feature groups in this ADR. For each command, record test file, test name,
   invocation surface, fixture, DOM/model effect, selection/focus effect,
   history expectation, persistence expectation, and remaining gaps. This may
   live in `docs/` or near `e2e/tests/`.
2. Fill the Selection, focus, and edit-mode routing group first, because all
   other command tests depend on reliable selected, text-editing, and
   group-editing state.
3. Fill the Text content editing, Text typography, and Object appearance groups
   with operation-effect tests that assert committed DOM, generated HTML, undo,
   redo, and representative refresh persistence.
4. Fill the Layout, transform, and direct manipulation group with toolbar,
   handle, keyboard movement, snap guide, rotation-clear, undo, redo, and
   refresh-persistence coverage.
5. Fill the Layering, alignment, and distribution group with operation-effect
   tests for Floating Toolbar, Context Menu, and keyboard entry paths.
6. Fill the Grouping, ungrouping, and nested-group flattening group, including
   the slide 12 Snap sibling fixture assertions for Group then Ungroup and
   Flatten and Group rendered dimension preservation.
7. Fill the Duplicate, remove, and Object Clipboard group, including Duplicate,
   Delete/Backspace parity, empty Object Clipboard paste, multi-selection paste
   id/position assertions, and native text clipboard isolation.
8. Add Cross-surface command parity tests after each feature group has at least
   one behavior assertion. Context Menu E2E tests are part of this work because
   ADR-0009 currently has no direct Context Menu behavior coverage.
9. Keep core operation unit tests for exact HTML transformation edge cases, but
   do not count them as substitutes for user-facing E2E coverage.

Affected paths:

- `e2e/tests/floating-toolbar.spec.ts`
- `e2e/tests/keyboard-and-multiselect.spec.ts`
- `e2e/tests/block-manipulation.spec.ts`
- `e2e/tests/selection.spec.ts`
- `e2e/tests/editor-chrome.spec.ts`
- `e2e/tests/text-editing.spec.ts`
- `e2e/tests/text-editing-history.spec.ts`
- `e2e/tests/helpers.ts`
- `src/editor/components/context-menu.tsx`
- `src/editor/components/floating-toolbar.tsx`
- `src/editor/hooks/use-editor-keyboard-shortcuts.ts`
- `src/core/slide-operations.ts`

## Verification

- [ ] A coverage matrix exists and lists every supported editing command and
      surface under the editing feature groups defined in this ADR.
- [ ] Selection, focus, and edit-mode routing behavior is covered before
      command-specific tests rely on those states.
- [ ] Text content editing, native text clipboard behavior, typography,
      appearance, attribute, and custom CSS edits have E2E tests that assert
      committed effects.
- [ ] Layout, transform, layering, alignment, and distribution commands have
      E2E behavior tests, not only visibility tests.
- [ ] Group then Ungroup preserves each child card's rendered width and height
      on the slide 12 Snap sibling fixture.
- [ ] Flatten and Group preserves each card's rendered width and height when
      two existing groups are grouped into one new group.
- [ ] Duplicate, remove, Object Clipboard, and keyboard-first commands have
      direct E2E tests.
- [ ] Cross-surface command parity is covered for commands exposed by Floating
      Toolbar, Context Menu, keyboard shortcuts, or direct manipulation.
- [ ] Undo and redo are covered for every undoable editing operation category.
- [ ] Persistence after refresh is covered for representative text, style,
      attribute, layout, grouping, and object clipboard mutations.
- [ ] `pnpm exec playwright test` passes for the full E2E suite before this ADR
      can be accepted.

## Consequences

Editing features will take longer to mark complete, because every user-facing
operation must include browser-level coverage. The payoff is that ADR-level
product promises can be verified mechanically instead of relying on manual
smoke testing.

The E2E suite will grow. Tests should be organized by editing capability and
should use helpers for repeated setup, but helpers must not hide the behavior
being verified.

Some currently passing tests will need to be strengthened. In particular,
visibility assertions for command menus should be paired with operation-effect
assertions.

## Alternatives considered

### Keep current ad hoc E2E coverage

Rejected. The current suite catches many regressions, but it leaves major
operation surfaces, especially Context Menu and arrangement commands, without
behavior coverage.

### Rely on unit tests for operation correctness

Rejected as the only strategy. Core unit tests are necessary for exact HTML
transformation behavior, but they do not prove event wiring, focus state,
selection state, browser layout, or persistence from the actual editor UI.

### Require visual snapshot coverage for every edit

Rejected for now. Visual checks are useful for layout regressions, but the
primary editing contract is semantic: operation invocation, DOM/model mutation,
selection state, history, and persistence. Visual regression testing can be
added later as a separate decision.
