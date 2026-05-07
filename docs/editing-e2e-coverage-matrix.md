# Editing E2E Coverage Matrix

This matrix implements ADR-0013's editing coverage contract. Each row maps a
supported editor-facing command or state route to browser-level coverage.

## Selection, Focus, And Edit-Mode Routing

| Command or behavior | Surfaces | Fixture | Expected effect | Selection/focus | History | Persistence | Test coverage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Select text, block, nested text, group, and multi-selection targets | Stage click, shift-click | Regression deck slides 1, 12, 13 | Correct target receives overlay | Overlay tracks selected target, group scope is respected | N/A | N/A | `selection.spec.ts`; `block-manipulation.spec.ts`; `keyboard-and-multiselect.spec.ts` |
| Hover preselection and pointer-depth retargeting | Stage hover, selected overlay click | Regression deck slide 1 | Hover previews the deepest editable target under the pointer; click selects that target even when an outer element is selected | Preselection overlay is passive and selection overlay moves to clicked target | N/A | N/A | `selection.spec.ts` |
| Clear selection | Stage background click, Escape | Regression deck | Toolbar/overlay hidden | No active selection | N/A | N/A | `selection.spec.ts`; `floating-toolbar.spec.ts`; `block-manipulation.spec.ts` |
| Enter and leave text editing | Double-click, Enter, Escape, blur, outside click | Regression deck slide 1 | Text draft commits or cancels according to gesture | Editing hint and native focus state update | Enter/blur commits are undoable; Escape is not | Text refresh persistence covered | `text-editing.spec.ts`; `text-editing-history.spec.ts`; `block-manipulation.spec.ts` |
| Chrome visibility during selected, dragging, resizing, rotating, text editing, and group editing | Stage, manipulation handles, keyboard | Regression deck | Toolbar and manipulation chrome hide/show at correct times | Active mode suppresses irrelevant chrome | N/A | N/A | `editor-chrome.spec.ts`; `block-manipulation.spec.ts`; `floating-toolbar.spec.ts` |
| Object commands unavailable during native text editing | Keyboard shortcuts, toolbar paths | Regression deck slide 1 | Native text edit changes text only | Object selection and object clipboard unchanged | Native undo remains separate from object commands | Text state persists after commit | `text-editing.spec.ts`; `text-editing-history.spec.ts`; `keyboard-and-multiselect.spec.ts` |
| Slide switching resets command routing | Sidebar slide switch | Regression deck slides 1, 2 | Commands target the newly active slide | Previous slide selection does not leak | N/A | N/A | `editor-chrome.spec.ts`; `selection.spec.ts` |

## Deck-Level Slide Operations

| Command or behavior | Surfaces | Fixture | Expected effect | Selection/focus | History | Persistence | Test coverage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Add slide after active slide | Sidebar add button | Regression deck | New blank slide is inserted immediately after the active slide | New slide becomes active and stage renders it | Undo removes the new slide; redo restores it | Refresh preserves new manifest entry and slide file | `editor-chrome.spec.ts` |
| Duplicate slide | Sidebar slide menu | Regression deck | Source slide is copied immediately after the source slide with unique `id` and `sourceFile` | Duplicate becomes active | Undo removes duplicate; redo restores it | Refresh preserves duplicate slide order and file | `editor-chrome.spec.ts` |
| Delete slide | Sidebar slide menu | Regression deck | Slide is removed from the deck and manifest; deleting the last slide is unavailable | Active slide moves to next slide, otherwise previous slide | Undo restores deleted slide at original index | Refresh keeps removed slide absent | `editor-chrome.spec.ts` |
| Hide and show slide | Sidebar slide menu | Regression deck | Slide `hidden` flag toggles and sidebar thumbnail dims with an EyeOff marker | Active slide stays editable | Undo/redo toggles visibility | Refresh preserves `manifest.slides[].hidden` | `editor-chrome.spec.ts` |
| Drag reorder slides | Sidebar thumbnail/grip drag | Regression deck | Dragged slide moves to the target list position | Active slide remains the same logical slide | Undo/redo restores previous/next order | Refresh preserves manifest order | `editor-chrome.spec.ts` |

## Text Content And Native Text Clipboard

| Command or behavior | Surfaces | Fixture | Expected effect | Selection/focus | History | Persistence | Test coverage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Text edit commit | Contenteditable, Enter, blur | Regression deck slide 1 | Slide DOM/model/generated HTML updated | Text editing exits on commit | Undo/redo restores exact text | Refresh shows rewritten HTML | `text-editing.spec.ts`; `text-editing-history.spec.ts` |
| Text edit cancel | Escape | Regression deck slide 1 | Draft discarded | Object selection returns | No new history entry | N/A | `block-manipulation.spec.ts` |
| Native Cut, Copy, Paste isolation | Keyboard while contenteditable focused | Regression deck slide 1 | Active text changes through native editing only | Object selection and Object Clipboard unchanged | Object undo does not consume native clipboard operations | Committed text persists | `text-editing.spec.ts`; `keyboard-and-multiselect.spec.ts` |
| Native shortcuts do not invoke object commands | Keyboard while contenteditable focused | Regression deck slide 1 | Object duplicate/delete/paste do not run | Text focus stays active | Object history unchanged | N/A | `text-editing.spec.ts`; `keyboard-and-multiselect.spec.ts` |

## Text Typography And Paragraph Formatting

| Command or behavior | Surfaces | Fixture | Expected effect | Selection/focus | History | Persistence | Test coverage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Font family and size | Floating Toolbar Font | Regression deck slide 1 | Inline `font-family` and `font-size` update | Selected text element remains selected | Undo/redo covered for representative formatting | Refresh persistence covered | `floating-toolbar.spec.ts` |
| Bold, italic, underline, strikethrough | Floating Toolbar Font | Regression deck slide 1 | Inline font weight/style/text decoration update | Toolbar remains stable | Undo/redo covered for representative formatting | Refresh persistence covered | `floating-toolbar.spec.ts` |
| Line height, alignment, text color | Floating Toolbar Paragraph/Fill | Regression deck slide 1 | Inline style or color attribute updates | Selected text element remains selected | Undo/redo covered for representative formatting | Refresh persistence covered | `floating-toolbar.spec.ts` |

## Object Appearance, Attributes, And Custom CSS

| Command or behavior | Surfaces | Fixture | Expected effect | Selection/focus | History | Persistence | Test coverage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Background, border, radius, shadow, opacity, lock | Floating Toolbar Fill/Border/Visibility | Regression deck slide 1 | Expected inline style is written | Selection retained | Undo/redo covered for appearance category | Refresh persistence covered | `floating-toolbar.spec.ts` |
| Link URL, alt text, ARIA label | Floating Toolbar Link/Text alternatives | Regression deck slide 1 | Expected HTML attributes are written | Selection retained | Undo/redo covered for attributes | Refresh persistence covered | `floating-toolbar.spec.ts` |
| Custom CSS add/update/remove | Floating Toolbar CSS | Regression deck slide 1 | Property can be added, overwritten, removed | Selection retained | Undo/redo covered for custom CSS | Refresh persistence covered | `floating-toolbar.spec.ts` |
| Invalid values | Floating Toolbar fields | Regression deck slide 1 | Browser normalizes or no-ops invalid style values | Selection retained | No unexpected history mutation | N/A | `floating-toolbar.spec.ts` |

## Layout, Transform, And Direct Manipulation

| Command or behavior | Surfaces | Fixture | Expected effect | Selection/focus | History | Persistence | Test coverage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Width, height, opacity, rotation, clear rotation preserving translate | Floating Toolbar Size/Visibility/Rotation | Regression deck slide 1 | Layout inline styles update | Selection retained | Undo/redo covered | Refresh persistence covered | `floating-toolbar.spec.ts`; `keyboard-and-multiselect.spec.ts` |
| Drag, resize, rotate handles | Manipulation handles | Regression deck slides 1, 12, 13 | Rendered element geometry changes | Toolbar suppressed during manipulation | Undo/redo covered | Representative persistence covered | `block-manipulation.spec.ts` |
| Snap guides during drag and resize | Manipulation handles | Regression deck slide 12 | Alignment guides appear for sibling targets anywhere on the slide, nearest eligible element target wins, alignment guides are high-contrast non-black, and spacing guides render capped distance references | Selection retained | Undo restores | N/A | `block-manipulation.spec.ts`; `keyboard-and-multiselect.spec.ts` |
| Arrow movement normal, Shift, Alt | Keyboard | Regression deck slide 1 | Transform translate changes by documented step | Selection retained | Undo/redo covered | N/A | `keyboard-and-multiselect.spec.ts` |

## Layering, Alignment, And Distribution

| Command or behavior | Surfaces | Fixture | Expected effect | Selection/focus | History | Persistence | Test coverage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Bring front/forward/backward/back | Floating Toolbar, Context Menu, keyboard shortcuts | Regression deck slide 1 | Rendered order/z-index changes | Selection retained | Undo/redo covered | Refresh persistence covered | `floating-toolbar.spec.ts`; `context-menu.spec.ts`; `keyboard-and-multiselect.spec.ts` |
| Align left/hcenter/right/top/vcenter/bottom | Floating Toolbar, Context Menu | Regression deck slide 1 | Rendered position aligns to slide edge/center | Selection retained | Undo/redo covered | Refresh persistence covered | `floating-toolbar.spec.ts`; `context-menu.spec.ts` |
| Distribute horizontal/vertical | Floating Toolbar, Context Menu | Regression deck slide 12 | Three selected elements become evenly spaced | Multi-selection retained | Undo/redo covered | Refresh persistence covered | `floating-toolbar.spec.ts`; `context-menu.spec.ts` |
| Irrelevant states hide/disable/no-op arrangement | Floating Toolbar, Context Menu, keyboard | Regression deck | Disabled/hidden state matches selection | No unexpected selection change | No unexpected history | N/A | `floating-toolbar.spec.ts`; `context-menu.spec.ts` |

## Grouping, Ungrouping, And Nested-Group Flattening

| Command or behavior | Surfaces | Fixture | Expected effect | Selection/focus | History | Persistence | Test coverage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Group and ungroup | Floating Toolbar, Context Menu | Regression deck slide 12 | Group DOM created; ungroup promotes children | Group selection and child scope update | Undo/redo covered | Refresh persistence covered | `floating-toolbar.spec.ts`; `context-menu.spec.ts`; `block-manipulation.spec.ts` |
| Ungroup unavailable for normal block | Floating Toolbar, Context Menu | Regression deck slide 1 | Ungroup disabled | Selection retained | No history | N/A | `floating-toolbar.spec.ts`; `context-menu.spec.ts` |
| Group-specific layout and rotation | Floating Toolbar, handles | Regression deck slide 13 | Group box mutates, children preserve visual style | Group remains selected | Undo/redo covered | Representative persistence covered | `block-manipulation.spec.ts`; `floating-toolbar.spec.ts` |
| Group then Ungroup preserves Snap sibling dimensions | Floating Toolbar | Regression deck slide 12 | Card A/Card B rendered width and height preserved | Promoted cards return to parent layer | Undo/redo covered | N/A | `block-manipulation.spec.ts`; `floating-toolbar.spec.ts` |
| Flatten and Group preserves child dimensions | Floating Toolbar | Regression deck slide 12 | Cards inside flattened group keep dimensions | New group selected | Undo/redo covered | N/A | `block-manipulation.spec.ts`; `floating-toolbar.spec.ts` |

## Duplicate, Remove, And Object Clipboard

| Command or behavior | Surfaces | Fixture | Expected effect | Selection/focus | History | Persistence | Test coverage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Duplicate | Keyboard, Context Menu | Regression deck slide 1 | New ids, geometry offset, duplicate selected | Selection moves to duplicate | Undo removes duplicate | Representative persistence covered | `keyboard-and-multiselect.spec.ts`; `context-menu.spec.ts` |
| Delete and Backspace | Keyboard, Context Menu | Regression deck slide 1 | Selected objects removed | Selection cleared | Undo restores objects | N/A | `keyboard-and-multiselect.spec.ts`; `context-menu.spec.ts` |
| Object Copy/Paste/Cut | Keyboard | Regression deck slides 1, 12 | Local Object Clipboard inserts new ids and preserves relative positions | Inserted objects selected | Cut/paste undo as user actions | Clipboard no-op after refresh | `keyboard-and-multiselect.spec.ts`; `text-editing.spec.ts` |
| Empty Object Clipboard paste | Keyboard | Regression deck slide 1 | No DOM or selection mutation | Selection unchanged | No history | N/A | `keyboard-and-multiselect.spec.ts` |

## Cross-Surface Command Parity

| Command or behavior | Surfaces | Fixture | Expected effect | Selection/focus | History | Persistence | Test coverage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Context Menu opens from selection and multi-selection | Right-click | Regression deck slides 1, 12 | Menu exposes valid commands | Selection preserved | N/A | N/A | `context-menu.spec.ts` |
| Duplicate/Delete/Group/Ungroup parity | Context Menu, keyboard, Floating Toolbar | Regression deck slides 1, 12 | Same DOM/model semantics across surfaces | Same selection semantics | Undo/redo covered | Representative persistence covered | `context-menu.spec.ts`; `keyboard-and-multiselect.spec.ts`; `floating-toolbar.spec.ts` |
| Layer/Align/Distribute parity | Context Menu, Floating Toolbar, keyboard where supported | Regression deck slides 1, 12 | Same rendered order/position/spacing semantics | Selection retained | Undo/redo covered | Representative persistence covered | `context-menu.spec.ts`; `floating-toolbar.spec.ts`; `keyboard-and-multiselect.spec.ts` |
