# Editing E2E Coverage Matrix

This matrix implements ADR-0013's editing coverage contract. Each row maps a
supported editor-facing command or state route to browser-level coverage.

## Selection, Focus, And Edit-Mode Routing

| Command or behavior | Surfaces | Fixture | Expected effect | Selection/focus | History | Persistence | Test coverage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Select text, block, nested text, group, and multi-selection targets | Stage click, shift-click | Regression deck slides 1, 12, 13 | Correct target receives overlay | Overlay tracks selected target, group scope is respected | N/A | N/A | `selection.spec.ts`; `block-manipulation.spec.ts`; `keyboard-and-multiselect.spec.ts` |
| Hover preselection and pointer-depth retargeting | Stage hover, selected overlay click | Regression deck slide 1 | Hover previews the deepest editable target under the pointer; click selects that target even when an outer element is selected | Preselection overlay is passive and selection overlay moves to clicked target | N/A | N/A | `selection.spec.ts` |
| Marquee selection and native selection suppression | Stage background drag | Regression deck slide 1 | Drag rectangle selects every touched editable target, including partial intersections, and excludes untouched targets | Marquee overlay is transient; final selection overlay spans selected targets; no browser-native blue text selection remains | N/A | N/A | `selection.spec.ts` |
| Clear selection | Stage background click, Escape | Regression deck | Toolbar/overlay hidden | No active selection | N/A | N/A | `selection.spec.ts`; `floating-toolbar.spec.ts`; `block-manipulation.spec.ts` |
| Enter and leave text editing | Double-click, Enter, Escape, blur, outside click | Regression deck slide 1 | Text draft commits or cancels according to gesture | Editing hint and native focus state update | Enter/blur commits are undoable; Escape is not | Text refresh persistence covered | `text-editing.spec.ts`; `text-editing-history.spec.ts`; `block-manipulation.spec.ts` |
| Reselect same element after editing exits | Double-click, stage background click, same-element click | Regression deck slide 1 | Text editing exits and same element can be selected again | Overlay returns for the same element after background exit | N/A | N/A | `text-editing.spec.ts` |
| Chrome visibility during selected, dragging, resizing, rotating, text editing, and group editing | Stage, manipulation handles, keyboard | Regression deck | Toolbar and manipulation chrome hide/show at correct times | Active mode suppresses irrelevant chrome | N/A | N/A | `editor-chrome.spec.ts`; `block-manipulation.spec.ts`; `floating-toolbar.spec.ts` |
| Object commands unavailable during native text editing | Keyboard shortcuts, toolbar paths | Regression deck slide 1 | Native text edit changes text only | Object selection and object clipboard unchanged | Native undo remains separate from object commands | Text state persists after commit | `text-editing.spec.ts`; `text-editing-history.spec.ts`; `keyboard-and-multiselect.spec.ts` |
| Slide switching resets command routing | Sidebar slide switch | Regression deck slides 1, 2 | Commands target the newly active slide | Previous slide selection does not leak | N/A | N/A | `editor-chrome.spec.ts`; `selection.spec.ts` |
| Slide navigation with no selection | ArrowUp/ArrowDown/ArrowLeft/ArrowRight | Regression deck slides 1-3 | Active slide changes to previous or next slide | Requires no active selection; selected elements keep arrow movement behavior | N/A | N/A | `keyboard-and-multiselect.spec.ts`; `editor-chrome.spec.ts` |

## Deck-Level Slide Operations

| Command or behavior | Surfaces | Fixture | Expected effect | Selection/focus | History | Persistence | Test coverage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Rename deck title | Editor header title input | Regression deck manifest | `manifest.topic` is updated without changing slide content | Header input keeps focus while editing | N/A | Refresh preserves renamed deck topic | `editor-chrome.spec.ts` |
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
| Font family and size | Floating Toolbar Font | Regression deck slide 1 | Inline `font-family` changes to an explicitly different option and `font-size` updates from both manual input and increment/decrement buttons | Selected text element remains selected | Undo/redo covered for representative formatting | Refresh persistence covered | `floating-toolbar.spec.ts` |
| Bold, italic, underline, strikethrough | Floating Toolbar Font | Regression deck slide 1 | Inline font weight/style/text decoration update | Toolbar remains stable | Undo/redo covered for representative formatting | Refresh persistence covered | `floating-toolbar.spec.ts` |
| Line height slider, alignment, text color | Floating Toolbar Paragraph/Fill | Regression deck slide 1 | Line-height slider reflects the selected element's current computed or inline line-height, commits inline `line-height`, and reopens at the committed value; alignment hover previews then commits; color attribute updates | Selected text element remains selected | Undo/redo covered for representative formatting | Refresh persistence covered | `floating-toolbar.spec.ts` |

## Object Appearance, Attributes, And Custom CSS

| Command or behavior | Surfaces | Fixture | Expected effect | Selection/focus | History | Persistence | Test coverage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Background color, gradient fill, border, radius, shadow, opacity | Floating Toolbar Fill/Border/Visibility | Regression deck slide 1 | Expected inline style is written, gradient controls update `background-image` live, and Fill trigger swatch mirrors the current fill | Selection retained; color picker popover stays open after preset selection | Undo/redo covered for appearance category | Refresh persistence covered | `floating-toolbar.spec.ts` |
| Image crop | Floating Toolbar Crop, crop handles, Enter, stage background click | Regression deck slide 16 | Image enters crop mode with blurred outside preview; corner handles update crop overlay without saving during drag; mouseup commits `clip-path`, including rounded crop radius; Enter and stage background click exit crop mode | Normal resize/rotate handles are hidden during crop mode; Enter exit preserves selection; stage background exit may clear selection | Crop commit is undoable through the style operation history path | Inline `clip-path` persists in generated slide HTML | `floating-toolbar.spec.ts` |
| Lock state | Floating Toolbar Lock | Regression deck slide 1 | Editor-local lock state restricts toolbar and direct manipulation; unlock restores editing controls | Selection retained for unlocking | No history; local-only state intentionally does not persist | No refresh persistence by design | `floating-toolbar.spec.ts` |
| Link URL, ARIA label | Floating Toolbar Link/Text alternatives | Regression deck slide 1 | Expected HTML attributes are written | Selection retained | Undo/redo covered for attributes | Refresh persistence covered | `floating-toolbar.spec.ts` |
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
| Ungroup unavailable for normal block without child editables | Floating Toolbar, Context Menu | Regression deck slide 12 | Ungroup disabled | Selection retained | No history | N/A | `floating-toolbar.spec.ts`; `context-menu.spec.ts` |
| Block Flatten through Ungroup | Context Menu | Regression deck slides 1, 3, 15 | Normal block remains in place; direct child editables are promoted one layer without rendered geometry or visual style changes; direct `ul`/`ol` children with editable `li` items are promoted as one list block without moving the bullets | Block and promoted children become selected siblings | Undo/redo covered | N/A | `context-menu.spec.ts` |
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
| Context Menu opens from hover preselection | Hover, right-click | Regression deck slide 1 | Menu exposes valid commands for the pointed editable target | Pointed target becomes selected | N/A | N/A | `context-menu.spec.ts` |
| Duplicate/Delete/Group/Ungroup parity | Context Menu, keyboard, Floating Toolbar | Regression deck slides 1, 12 | Same DOM/model semantics across surfaces | Same selection semantics | Undo/redo covered | Representative persistence covered | `context-menu.spec.ts`; `keyboard-and-multiselect.spec.ts`; `floating-toolbar.spec.ts` |
| Layer/Align/Distribute parity | Context Menu, Floating Toolbar, keyboard where supported | Regression deck slides 1, 12 | Same rendered order/position/spacing semantics | Selection retained | Undo/redo covered | Representative persistence covered | `context-menu.spec.ts`; `floating-toolbar.spec.ts`; `keyboard-and-multiselect.spec.ts` |
