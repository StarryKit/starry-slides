# Editor Context

## Purpose

`src/editor` owns the interactive browser editor UI inside `@starrykit/slides`.

Shared roadmap lives in
[ROADMAP.md](/Users/haichao/code/starry-slides/ROADMAP.md).

This module is responsible for:

- rendering the editing shell around slide content
- composing the root browser app under `src/editor/app`
- translating user interactions into `src/core` operations
- managing transient interaction state such as selection and in-progress editing
- rendering overlays, thumbnails, and the floating toolbar
- providing Tailwind/shadcn editor chrome and UI primitives

It consumes `src/core` APIs and should not redefine document or history
semantics locally.

## Current Implementation Status

- text double-click editing is implemented for supported editable text elements
- local undo/redo for committed edits is implemented through core history
- selected editable elements are edited through the Floating Toolbar; the
  Sidebar Tool Panel is no longer part of the active editor model
- block movement and resizing support snapping through editor interaction
  helpers
- the browser app loads manifest-driven decks through `/deck/manifest.json`

## Current Interaction Model

The editor owns transient behavior such as:

- active slide selection
- editable element selection
- selection overlay placement
- text-editing session state
- keyboard shortcuts that trigger shared history actions

Committed edits must flow through `src/core` operations rather than direct
feature-local persistence logic.

## Language

**Floating Toolbar**:
The contextual element tooling surface shown near the current editable element
selection.
_Avoid_: toolbar mode, compact mode

**Sidebar Tool Panel**:
The removed right-side element tooling surface that should not be used for new
editor interactions.
_Avoid_: inspector, panel mode, tool panel mode

**Element Tooling**:
Controls and commands that operate on the current editable element selection.
_Avoid_: inspector controls, panel controls

**Context Menu**:
The secondary right-click shortcut surface for selection-specific commands.
_Avoid_: primary toolbar, hidden toolbar

**Object Clipboard**:
The editor-local clipboard for copied editable element selections.
_Avoid_: system clipboard, text clipboard

**Group**:
A specialized block selected and manipulated as an editor-created organization
object while containing child editable elements.
_Avoid_: groupId selection, linked selection

**Block**:
A normal content object that may contain editable content. A Block with direct
child editable elements can be flattened through Ungroup, but it does not become
a Group and the Block itself is preserved.
_Avoid_: group, wrapper

**Group Editing Scope**:
A focused interaction state where selection is constrained to the child
editable elements inside one group.
_Avoid_: unlocked group, penetrate mode

**Flatten and Group**:
The user-facing grouping behavior where selected groups are expanded before a
new group is created.
_Avoid_: nested group

**Block Flatten**:
The Ungroup behavior for a normal Block with direct child editable elements:
promote those children to the Block's parent layer while keeping the Block in
place.
_Avoid_: recursive flatten, group conversion

**Group Focus Overlay**:
The visual treatment that de-emphasizes content outside the active group while
the editor is in a group editing scope.
_Avoid_: modal overlay, disabled slide

**Geometry Scaling**:
Resizing behavior that updates child element positions and boxes without scaling
typography or decorative visual styles.
_Avoid_: full visual scaling, font scaling

## Relationships

- A selected **editable element** is edited through the **Floating Toolbar**.
- The **Sidebar Tool Panel** is historical UI and is not an alternative editing
  surface.
- A **Block** is content structure; a **Group** is editor organization
  structure.
- A normal **Block** may contain child editable elements without becoming a
  **Group**.
- A **Group** is selected as one editable element before the user enters its
  child-editing interaction.
- Grouping selected groups uses **Flatten and Group** rather than creating a
  true nested group.
- **Flatten and Group** always creates a new group id.
- **Block Flatten** uses the **Ungroup** command for a selected normal
  **Block** with direct child editable elements.
- **Block Flatten** promotes only direct child editable elements and keeps the
  original **Block** in place.
- A **Group** is not edited as a visual **Block**. Users who need a fill,
  border, shadow, or other visual container should insert and style a normal
  **Block**.
- Double-clicking a **Group** enters the **Group Editing Scope** for that group.
- Escape exits **Group Editing Scope** and returns selection to the **Group**,
  unless text editing is active, in which case Escape exits text editing first.
- While a **Group Editing Scope** is active, a **Group Focus Overlay**
  de-emphasizes slide content outside the active **Group**.
- First-version **Group** and multi-selection resize uses **Geometry Scaling**:
  child positions and boxes scale, while font size, line height, padding, gap,
  border radius, and shadows do not.
- **Group**, **Ungroup**, **Layer**, **Align**, and **Distribute** are
  **Element Tooling** commands with discoverable **Floating Toolbar** entries and
  shortcut **Context Menu** entries.
- **Delete** and **Duplicate** are selection commands exposed through keyboard
  shortcuts and the **Context Menu**; they do not need **Floating Toolbar**
  entries.
- **Context Menu** behavior should be built from a shadcn/Radix primitive rather
  than custom menu mechanics where possible.
- Object-level Cut, Copy, and Paste use the **Object Clipboard**.
- Text editing Cut, Copy, and Paste use native browser text editing behavior,
  not the **Object Clipboard**.

## Example dialogue

> **Dev:** "Should this new border control go in the Sidebar Tool Panel too?"
> **Domain expert:** "No. Element tooling belongs in the Floating Toolbar; the
> Sidebar Tool Panel is being removed."

> **Dev:** "Should Duplicate be added to the Floating Toolbar because it appears
> in the Context Menu?"
> **Domain expert:** "No. Duplicate is a keyboard and Context Menu command; the
> Floating Toolbar should keep discoverable layout and grouping tooling."

> **Dev:** "Is this group just several selected elements with the same group id?"
> **Domain expert:** "No. Grouping is represented by a nested DOM container, and
> the editor selects that container as the group."

> **Dev:** "This block contains directly editable child elements. Should the
> toolbar show Ungroup?"
> **Domain expert:** "Yes, when Ungroup can perform Block Flatten. It should
> promote the direct editable children without removing or moving the Block."

> **Dev:** "Should a selected Group show fill and border controls?"
> **Domain expert:** "No. Group is organization structure; visual containers are
> normal Blocks."

> **Dev:** "Should object Copy write to the system clipboard?"
> **Domain expert:** "Not in the first version. Object Copy uses the editor's
> Object Clipboard; text editing can keep native browser clipboard behavior."

> **Dev:** "Why is the rest of the slide dimmed?"
> **Domain expert:** "The editor is in a Group Editing Scope, so the overlay
> shows that commands apply inside the active group."

> **Dev:** "When I resize a group, should the font size inside scale too?"
> **Domain expert:** "Not in the first version. Group resize uses Geometry
> Scaling: boxes and positions scale, typography does not."
