# E2E Coverage Matrix

This document records the browser-level E2E coverage that currently exists in
`e2e/tests/`.

This file is the source of truth for repository E2E coverage inventory. When an
E2E test is added, removed, or materially changed, this file must be updated in
the same change so the documented matrix stays aligned with the code.

Scope notes:

- This matrix is derived from the current Playwright specs, not from ADR text
  or intended future coverage.
- A row only claims behavior that is explicitly asserted by the current tests.
- `Persistence` means the current test actually reloads or reopens and asserts
  the result. If not, it is listed as `Not asserted`.
- `History` means the current test actually exercises undo/redo or explicitly
  asserts no-history behavior.

## Selection, Focus, And Edit-Mode Routing

| Behavior currently covered | Surfaces | Fixture | What the current tests assert | History | Persistence | Test coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Plain click selects a text element; double click enters text editing | Stage click, double click | Regression deck slide 1 | Selection overlay appears on click; `contenteditable` appears on double click; floating toolbar hides while editing | Not asserted | Not asserted | `selection.spec.ts` |
| Selection overlay tracks the selected element bounds | Stage click | Regression deck slide 1 | Overlay bounding box stays aligned to selected text bounds within tolerance | N/A | N/A | `selection.spec.ts` |
| Nested text is selected instead of its parent block | Stage click | Regression deck slide 1 | Overlay matches nested text bounds and not the parent block bounds | N/A | N/A | `selection.spec.ts` |
| Hover preselection appears on the pointed editable target | Stage hover | Regression deck slide 1 | Passive preselection overlay appears; selection overlay stays hidden; manipulation handles stay absent | N/A | N/A | `selection.spec.ts` |
| Dragging from preselection selects and moves the pointed target in one gesture | Stage hover, drag | Regression deck slide 1 | Preselected nested text becomes selected and moves; overlay follows the moved element | Not asserted | Not asserted | `selection.spec.ts` |
| Pointer-depth retargeting from a selected outer block to nested text | Stage click, hover, click | Regression deck slide 1 | Clicking nested text through a selected outer block moves selection to the deeper target | N/A | N/A | `selection.spec.ts` |
| Marquee selects touched top-level editables and excludes untouched ones | Stage background drag | Regression deck slide 1 | Marquee overlay is transient; final selection spans touched targets; arrow-key movement affects selected targets but not untouched text | Undo for marquee itself not asserted | Not asserted | `selection.spec.ts` |
| Marquee on nested content selects the outer editable block | Stage background drag | Regression deck slide 10 | Final overlay matches the outer block, not the nested child | N/A | N/A | `selection.spec.ts` |
| Multi-selection drag can start from a nested child inside a selected outer block | Stage click, shift-click, drag | Regression deck slide 10 | Two selected blocks move together even when drag starts on nested child content | Undo not asserted | Not asserted | `selection.spec.ts` |
| Marquee does not leave native browser text selected | Stage background drag | Regression deck slide 1 | Both top-level window selection and iframe selection end empty after drag | N/A | N/A | `selection.spec.ts` |
| Clicking blank stage space clears selection | Stage background click | Regression deck slide 1 | Selection overlay hides after blank-stage click | Explicit no-history behavior not asserted in this path | N/A | `text-editing-history.spec.ts`; `editor-chrome.spec.ts` |
| Clicking a block outside editing only selects and does not create history | Stage click | Regression deck slide 1 | Block selection appears; `Meta/Ctrl+Z` does not clear selection or undo anything | No-op undo asserted | N/A | `block-manipulation.spec.ts` |
| Text editing exits on Enter without changes and does not create history | Keyboard Enter | Regression deck slide 1 | Editing exits; text remains unchanged; immediate undo is a no-op | No-op undo asserted | N/A | `text-editing-history.spec.ts` |
| Text editing commits on Enter | Keyboard Enter | Regression deck slide 1 | Edited text is committed and visible after exit | Undo/redo asserted in dedicated history specs | Refresh asserted in dedicated persistence spec | `text-editing.spec.ts`; `text-editing-history.spec.ts` |
| Text editing commits on blur / outside block click | Block click while editing | Regression deck slide 1 | Editing exits and edited text is committed after clicking another block | Undo/redo asserted | Not asserted | `text-editing.spec.ts` |
| Text editing exits on single outside click | Block click while editing | Regression deck slide 1 | Editing mode exits when clicking another block | Undo not asserted | Not asserted | `text-editing.spec.ts` |
| Text editing cancels on Escape | Keyboard Escape | Regression deck slide 1 | Draft text is discarded and editing exits | No new history entry asserted via undo no-op | N/A | `group-and-resize.spec.ts` |
| Same element can be selected again after leaving editing via stage background | Double click, stage background click, same-element click | Regression deck slide 1 | Editing exits, overlay stays hidden, then returns when clicking the same element again | N/A | N/A | `text-editing.spec.ts` |
| Cursor returns to default after leaving text editing | Double click, click another element | Regression deck slide 1 | Cursor changes to text while editing and returns to default after exit | N/A | N/A | `text-editing-history.spec.ts` |
| Editing mode shows no instruction prompt | Double click | Regression deck slide 1 | No visible instructional prompt is rendered while editing | N/A | N/A | `text-editing.spec.ts` |
| Chrome hides during text editing | Double click | Regression deck slide 1 | Selection overlay and floating toolbar hide; editing element has no outline/box-shadow chrome | N/A | N/A | `editor-chrome.spec.ts` |
| Floating toolbar is the only primary element tooling surface | Stage click | Regression deck slide 1 | Floating toolbar appears on selection; sidebar/tool-panel mode controls are absent | N/A | N/A | `selection.spec.ts`; `floating-toolbar.spec.ts` |
| Floating toolbar and manipulation handles hide while dragging, then return afterward | Drag selected element | Regression deck slide 1 | Toolbar hides on drag start; resize and rotate handles disappear during drag and reappear after mouseup | N/A | N/A | `block-manipulation.spec.ts` |
| Selected block/text/image can be dragged by the existing selection overlay | Overlay drag | Regression deck slides 1, 7 | Element moves; overlay stays aligned; only one selection overlay remains | Undo for these drag paths not asserted | Not asserted | `block-manipulation.spec.ts` |
| After dragging and clearing selection, the same element can be selected again | Overlay drag, stage background click, element click | Regression deck slide 1 | Selection clears and then returns on the same block | N/A | N/A | `block-manipulation.spec.ts` |
| Dragging a different element immediately after a drag retargets correctly | Consecutive direct drags | Regression deck slide 12 | Second target moves; first target stays where the first drag left it | N/A | N/A | `block-manipulation.spec.ts` |
| Double clicking a non-text block does not enter text editing | Double click | Regression deck slide 1 | Non-text block never becomes `contenteditable` | N/A | N/A | `block-manipulation.spec.ts` |
| Double clicking a group enters group scope; Escape returns from child edit to group, then from group scope | Double click, Escape | Regression deck slide 12 | Group scope attributes toggle correctly; child text editing exits back to group; second Escape exits group scope | N/A | N/A | `group-and-resize.spec.ts` |
| Arrow keys navigate slides only when no element is selected | ArrowUp, ArrowDown, ArrowLeft, ArrowRight | Regression deck slides 1-3 | Active slide changes with no selection; once an element is selected, the same arrow key moves the element instead | Element movement undo/redo asserted in keyboard spec; slide navigation history not asserted | N/A | `keyboard-and-multiselect.spec.ts` |
| Selecting another element after clearing selection does not break the editor | Stage click, background click, stage click | Regression deck slide 1 | App stays mounted; no page errors are thrown while reselection happens | N/A | N/A | `editor-chrome.spec.ts` |
| Double clicking a nested text child enters editing on the correct child element | Double click | Regression deck slide 2 | Paragraph becomes `contenteditable`; sibling title and parent card do not | N/A | N/A | `editor-chrome.spec.ts` |

## Deck-Level Slide Operations

| Behavior currently covered | Surfaces | Fixture | What the current tests assert | History | Persistence | Test coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Deck title rename updates manifest topic and survives reload | Header input | Regression deck manifest | Title input updates; saving badge appears; `/deck/manifest.json` returns new `topic`; reload keeps new title | Undo/redo not asserted | Reload asserted | `editor-chrome.spec.ts` |
| Sidebar chrome, counts, and slide action menu are rendered | Sidebar hover, right click | Regression deck | Sidebar width is stable; slide count is visible; slide actions menu exposes Add Above/Add Below/Duplicate/Rename/Hide/Delete | N/A | N/A | `editor-chrome.spec.ts` |
| Sidebar context menu can add slides above and below a clicked slide | Sidebar context menu | Regression deck | Slide count increments; inserted slide becomes active; stage renders `Untitled Slide` | Undo/redo not asserted | Reload not asserted | `editor-chrome.spec.ts` |
| Sidebar context menu can rename a slide and survive reload | Sidebar context menu, dialog | Regression deck | Cancel path does not apply title; save path updates sidebar label; manifest `slides[n].title` updates; reload keeps renamed title | Undo/redo not asserted | Reload asserted | `editor-chrome.spec.ts` |
| Add slide button inserts a new slide after the active slide | Sidebar add button | Regression deck | Slide count increments; new slide becomes active; stage renders `Untitled Slide` | Undo/redo not asserted | Reload not asserted | `editor-chrome.spec.ts` |
| Slide context menu duplicate creates another slide after the new slide and activates it | Sidebar context menu | Regression deck | Slide count increments again; duplicated slide becomes active | Slide file identity and manifest internals not asserted | Reload not asserted | `editor-chrome.spec.ts` |
| Slide context menu hide/show toggles the hidden indicator | Sidebar context menu | Regression deck | Hidden indicator appears on Hide and disappears on Show | Undo/redo not asserted | Reload not asserted | `editor-chrome.spec.ts` |
| Slide context menu delete removes the slide card and keeps an adjacent slide active | Sidebar context menu | Regression deck | Slide count decrements after delete; an adjacent slide remains active | Undo/redo not asserted | Reload not asserted | `editor-chrome.spec.ts` |
| Sidebar drag reorder changes slide order and survives reload | Sidebar drag | Regression deck | First slide dragged to third position; visible ordering changes; saving badge appears; reload preserves new order | Undo/redo not asserted | Reload asserted | `editor-chrome.spec.ts` |
| Sidebar drag shows an insertion marker while reordering | Sidebar drag | Regression deck | Insertion marker appears between slide cards while dragging | N/A | N/A | `editor-chrome.spec.ts` |
| PDF export opens a scope dialog and submits selected-slides or all-slides payloads | Export menu, dialog | Regression deck | Export dialog defaults to All slides; Selected slides picker renders thumbnails; intercepted request payloads match chosen scope; success toast appears | N/A | Dialog reset on reopen asserted | `editor-chrome.spec.ts` |

## Text Content Editing And Native Text Selection

| Behavior currently covered | Surfaces | Fixture | What the current tests assert | History | Persistence | Test coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Text edit commit rewrites visible content and survives reload | Contenteditable, Enter | Regression deck slide 1 | Edited text is committed; saving badge appears; reload shows the edited text | Undo/redo asserted in history specs | Reload asserted | `text-editing.spec.ts`; `text-editing-history.spec.ts` |
| Saving badge appears while debounced text persistence is in flight | Contenteditable, Enter | Regression deck slide 1 | Saving badge becomes visible and then hides after commit | N/A | N/A | `text-editing.spec.ts` |
| Text editing commit on blur keeps undo/redo disabled while still editing | Contenteditable, block click, keyboard undo/redo | Regression deck slide 1 | Undo during active editing does nothing; after blur commit, undo and redo change the text | Undo/redo asserted | Not asserted | `text-editing.spec.ts` |
| Leading and trailing whitespace are preserved exactly across undo/redo | Contenteditable, Enter | Regression deck slide 1 | Committed text keeps surrounding spaces; undo/redo restore exact values | Undo/redo asserted | Not asserted | `text-editing.spec.ts` |
| Whitespace-only surrounding edits still create a committed history entry | Contenteditable, Enter | Regression deck slide 1 | Adding only surrounding spaces commits and participates in undo/redo | Undo/redo asserted | Not asserted | `text-editing.spec.ts` |
| Keyboard partial selection can be deleted before commit | Contenteditable, Shift+Arrow, Backspace, Enter | Regression deck slide 1 | A selected suffix is deleted and committed | Undo/redo not asserted | Not asserted | `text-editing.spec.ts` |
| Real dragged partial text selection remains active inside editing | Mouse drag inside contenteditable | Regression deck slide 1 | Dragging inside the active text element produces a non-empty native selection | N/A | N/A | `text-editing.spec.ts` |
| Real dragged text selection can be deleted before commit | Mouse drag, Backspace-equivalent DOM deletion, Enter | Regression deck slide 1 | Selected text is removed and committed; resulting text is shorter than original | Undo/redo not asserted | Not asserted | `text-editing.spec.ts` |
| Double clicking a word during editing keeps editing active and allows deleting that word | Double click inside contenteditable, Backspace, Enter | Regression deck slide 1 | Word selection happens inside editing mode; editing stays active; committed text becomes shorter | Undo/redo not asserted | Not asserted | `text-editing.spec.ts` |
| Keyboard undo/redo after text commit works through multiple paths and preserves stack order | Keyboard shortcuts | Regression deck slides 1 | `Meta/Ctrl+Z`, `Meta/Ctrl+Shift+Z`, and `Meta/Ctrl+Y` restore exact text states; undo/redo do not create extra history entries; two edits unwind and replay in order | Undo/redo asserted | Not asserted | `text-editing-history.spec.ts` |
| Select all inside text editing uses native text selection instead of object selection | `Meta/Ctrl+A` while editing | Regression deck slide 1 | Native iframe text selection contains the whole text; object selection overlay stays hidden | N/A | N/A | `keyboard-and-multiselect.spec.ts` |

## Text Typography And Paragraph Formatting

| Behavior currently covered | Surfaces | Fixture | What the current tests assert | History | Persistence | Test coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Font family can be changed from the floating toolbar | Floating Toolbar Font | Regression deck slide 1 | Selecting `Georgia` changes inline `font-family`; menu hover previews and un-hover reverts before commit in the dedicated font test | Undo/redo asserted | Reload not asserted | `floating-toolbar.spec.ts` |
| Font size can be changed by increment button and manual input | Floating Toolbar Font | Regression deck slide 1 | Increase button changes inline `font-size`; manual input writes exact pixel value | Undo/redo for font-size itself not asserted | Reload not asserted | `floating-toolbar.spec.ts` |
| Font size input clamps out-of-range values and step buttons keep working | Floating Toolbar Font | Regression deck slide 1 | Manual values clamp to min/max and adjacent step buttons continue to work | Undo/redo not asserted | N/A | `floating-toolbar.spec.ts` |
| Font size toolbar stays mounted while using step buttons | Floating Toolbar Font | Regression deck slide 1 | Toolbar remains visible after using increase button | N/A | N/A | `floating-toolbar.spec.ts` |
| Bold, italic, underline, and strikethrough controls write inline styles | Floating Toolbar Font | Regression deck slide 1 | Inline `font-weight`, `font-style`, and `text-decoration-line` update as buttons are clicked | Undo/redo for these specific controls not asserted | Reload not asserted | `floating-toolbar.spec.ts` |
| Line-height slider reflects computed state, writes committed inline state, and reopens at the committed value | Floating Toolbar Paragraph | Regression deck slides 1 | Slider min/max/step are asserted; changing value writes inline `line-height`; reopening shows the committed value, including for an element with computed starting line height | Undo/redo for line-height not asserted | Reload not asserted | `floating-toolbar.spec.ts` |
| Alignment hover previews and click commits alignment | Floating Toolbar Paragraph | Regression deck slide 1 | Hovering `Center` previews `text-align`; moving away reverts preview; click commits `center` | Undo/redo asserted for committed alignment | Reload not asserted | `floating-toolbar.spec.ts` |
| Text color picker reflects existing alpha and updates text color/opacity | Floating Toolbar Text color | Regression deck slide 1 | Text color popover reads existing color/alpha; opacity slider changes live alpha; preset keeps popover open and preserves chosen alpha range | Undo/redo not asserted | Reload not asserted | `floating-toolbar.spec.ts` |

## Object Appearance And Attributes

| Behavior currently covered | Surfaces | Fixture | What the current tests assert | History | Persistence | Test coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Background color panel supports gradient controls and trigger swatch reflection | Floating Toolbar Background color | Regression deck slide 1 | Gradient preset writes inline `background-image`; angle and start color update it; trigger icon mirrors the current gradient | Undo/redo not asserted | Reload not asserted | `floating-toolbar.spec.ts` |
| Border controls update style, width, radius, shadow, and border color | Floating Toolbar Border | Regression deck slide 1 | Hover previews dashed border; click commits style; stroke weight, corner radius, shadow, and border color update inline styles and trigger visuals | Undo/redo not asserted | Reload not asserted | `floating-toolbar.spec.ts` |
| Border menu reflects existing selected element styles on first open | Floating Toolbar Border | Regression deck slide 1 | Existing dashed border, radius, shadow, and color are read into the UI on first open | N/A | N/A | `floating-toolbar.spec.ts` |
| Image selection hides text-only tools and exposes crop-capable toolbar | Floating Toolbar on image selection | Regression deck slide 16 | Font/text-color controls are hidden for images; crop, border, and other controls remain visible | N/A | N/A | `floating-toolbar.spec.ts` |
| Image crop mode previews while dragging, commits on mouseup-exit path, and participates in undo/redo | Floating Toolbar Crop, crop handles, Enter, stage click | Regression deck slide 16 | Crop overlay and mask render; normal resize/rotate handles hide in crop mode; drag updates preview bounds without immediately writing parseable `clip-path`; stage click exits crop mode and commits rounded `clip-path`; re-enter then `Enter` exits while preserving selection; undo removes clip-path and redo restores it | Undo/redo asserted | Reload not asserted | `floating-toolbar.spec.ts` |
| Link dialog writes `data-link-url` and ARIA label dialog writes `aria-label` | Floating Toolbar Other dialogs | Regression deck slide 1 | Saving link and ARIA label writes the corresponding attributes | Undo/redo not asserted | Reload asserted | `floating-toolbar.spec.ts` |
| Lock mode swaps toolbar affordances and blocks direct manipulation until unlocked | Floating Toolbar Lock | Regression deck slide 1 | Lock hides editing controls and resize handle, shows only Unlock, and prevents drag movement; Unlock restores normal controls | Undo/redo not asserted | Reload not asserted | `floating-toolbar.spec.ts` |

## Layout, Transform, And Direct Manipulation

| Behavior currently covered | Surfaces | Fixture | What the current tests assert | History | Persistence | Test coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Snap alignment guides appear during drag and use a high-contrast red guide color | Direct manipulation drag | Regression deck slide 12 | Alignment guide appears while dragging toward a sibling edge; guide color is asserted as `rgb(239, 68, 68)` | Undo/redo not asserted | N/A | `block-manipulation.spec.ts` |
| Snap target selection prefers the nearer eligible sibling | Direct manipulation drag | Regression deck slide 12 | Dragged block snaps to the nearer sibling edge and not the farther candidate | Undo/redo not asserted | N/A | `block-manipulation.spec.ts` |
| Spacing guides render capped end markers in the guide color | Direct manipulation drag | Regression deck slide 12 | Spacing guide appears with red color and exactly two end caps | Undo/redo not asserted | N/A | `block-manipulation.spec.ts` |
| All four resize handles are visible for a selected element | Selection handles | Regression deck slide 1 | Top-left, top-right, bottom-right, and bottom-left resize handles are visible | N/A | N/A | `block-manipulation.spec.ts` |
| Resizing a flow-layout title keeps it in document flow | Resize handle drag with Alt | Regression deck slide 1 | Title width/height grow; inline `position`, `left`, and `top` stay flow-layout-safe; neighboring summary does not jump upward | Undo/redo not asserted | Not asserted | `block-manipulation.spec.ts` |
| Group resize scales child geometry without scaling child visual styling | Resize handle drag with Alt | Regression deck slide 13 | Group and child bounds grow; child font size and padding remain unchanged; selection overlay remains visible | Undo/redo not asserted | Not asserted | `group-and-resize.spec.ts` |
| Arrow keys move selected objects by normal and Shift step sizes | Keyboard arrows | Regression deck slide 1 | ArrowRight writes `translate(5px, 0px)`; `Shift+ArrowDown` extends to `translate(5px, 10px)` | Undo/redo asserted | N/A | `keyboard-and-multiselect.spec.ts` |
| Alt+Arrow uses the fine movement step | Keyboard Alt+Arrow | Regression deck slide 1 | `Alt+ArrowRight` writes `translate(1px, 0px)` | Undo/redo not asserted | N/A | `keyboard-and-multiselect.spec.ts` |
| Multi-selected sibling cards move together by keyboard | Keyboard arrows on multi-selection | Regression deck slide 12 | Two selected cards both move by the same vertical delta | Undo asserted | N/A | `keyboard-and-multiselect.spec.ts` |
| Multi-selected sibling cards move together by overlay drag | Overlay drag on multi-selection | Regression deck slide 12 | Two selected cards both move materially in x and y after dragging the shared overlay | Undo not asserted | N/A | `keyboard-and-multiselect.spec.ts` |

## Layering, Alignment, Distribution, Grouping, And Flattening

| Behavior currently covered | Surfaces | Fixture | What the current tests assert | History | Persistence | Test coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Keyboard layer shortcuts update `z-index` | Keyboard shortcuts | Regression deck slide 1 | `Meta/Ctrl+]`, `Meta/Ctrl+Shift+]`, and `Meta/Ctrl+Shift+[` write `z-index` values `1`, `999`, and `0` | Redo not asserted for this path | N/A | `keyboard-and-multiselect.spec.ts` |
| Context menu layer and align commands change rendered order and position | Context menu submenu | Regression deck slide 1 | `Bring to front` writes `z-index: 999`; `Align left` moves the element to slide x=0 | Undo/redo asserted for align path | Reload not asserted | `context-menu.spec.ts` |
| Multi-selection toolbar exposes Align/Layer/Distribute/Group controls | Floating toolbar on multi-selection | Regression deck slide 12 | These controls become visible; Duplicate/Delete stay hidden; button order is asserted | N/A | N/A | `floating-toolbar.spec.ts` |
| Floating toolbar align action is invoked and mutates position | Floating toolbar Align | Regression deck slide 12 | Clicking `Align left` from the toolbar path is exercised before grouping | Undo/redo for this exact path not asserted | Reload not asserted | `floating-toolbar.spec.ts` |
| Context menu horizontal distribute repositions the middle card evenly | Context menu submenu | Regression deck slide 12 | Three selected cards become horizontally centered relative to one another; middle card position changes | Undo asserted | Reload not asserted | `context-menu.spec.ts` |
| Context menu duplicate and delete follow object-style semantics | Context menu | Regression deck slide 1 | Duplicate creates `text-1-copy`, offsets geometry, selects the copy, delete removes it and clears overlay | Undo asserted for duplicate and delete | Reload not asserted | `context-menu.spec.ts` |
| Floating toolbar group action is invoked and exposes Ungroup afterward | Floating toolbar | Regression deck slide 12 | Group button creates `group-1`; toolbar swaps to show `Ungroup` | Undo/redo not asserted in this path | Reload not asserted | `floating-toolbar.spec.ts` |
| Context menu group and ungroup preserve snap-card dimensions | Context menu | Regression deck slide 12 | Group is created; Ungroup removes it; both cards keep pre-group width/height within tolerance | Undo/redo asserted | Reload not asserted | `context-menu.spec.ts` |
| Floating toolbar ungroup preserves snap-card dimensions | Floating toolbar | Regression deck slide 12 | Group then Ungroup returns both cards to their original width/height within tolerance | Undo/redo not asserted | Reload not asserted | `floating-toolbar.spec.ts` |
| Context menu Ungroup is disabled for a normal single block without editable children to promote | Context menu | Regression deck slide 5 | Both Group and Ungroup menu items carry the disabled attribute on a normal single block | N/A | N/A | `context-menu.spec.ts` |
| Context menu block flatten promotes one layer of direct editable children without changing geometry or typography | Context menu Ungroup | Regression deck slide 15 | First Ungroup promotes `flatten-middle` out of `flatten-outer` while preserving rects and visual style; second Ungroup promotes `flatten-inner` out of `flatten-middle`; undo restores both flatten steps | Undo asserted | Reload not asserted | `context-menu.spec.ts` |
| Context menu block flatten preserves list grouping and bullet positions | Context menu Ungroup | Regression deck slide 3 | Ungroup promotes the `ul` as one block; `li` items stay inside `UL`; card/title/body/list rects remain stable; undo restores original nesting | Undo asserted | Reload not asserted | `context-menu.spec.ts` |
| Floating toolbar grouping selected groups into a new group preserves child dimensions | Floating toolbar Group | Regression deck slide 12 | Two existing groups are grouped into `group-3`; all four child cards keep their pre-group width/height within tolerance | Undo/redo not asserted | Reload not asserted | `floating-toolbar.spec.ts` |
| Group scope selection behaves differently from outside-group selection | Group overlay double click, child click, outside click | Regression deck slide 12 | Group scope attributes toggle; outside card is marked outside scope; selection overlay can target grouped child while scope stays active | Undo/redo not asserted | Reload not asserted | `group-and-resize.spec.ts` |

## Duplicate, Delete, Clipboard, And Multi-Selection Editing

| Behavior currently covered | Surfaces | Fixture | What the current tests assert | History | Persistence | Test coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Keyboard Backspace deletes the selected object | Keyboard Backspace | Regression deck slide 1 | Selected text element disappears and selection clears | Undo asserted | N/A | `keyboard-and-multiselect.spec.ts` |
| Keyboard Delete matches Backspace semantics | Keyboard Delete | Regression deck slide 1 | Selected text element disappears | Undo asserted | N/A | `keyboard-and-multiselect.spec.ts` |
| Object copy/paste uses editor-local semantics and does not write to the system clipboard | Keyboard copy/paste | Regression deck slide 1 | Stubbed `navigator.clipboard.writeText` is never used; pasted copy gets a new id, offset geometry, selection, and its own movement path | Undo asserted for movement and removal | Reload not asserted | `keyboard-and-multiselect.spec.ts` |
| Pasting with an empty object clipboard is a no-op | Keyboard paste | Regression deck slide 1 | No copy node is created; body HTML is unchanged | No history mutation implied, undo not explicitly checked | N/A | `keyboard-and-multiselect.spec.ts` |
| Repeated paste clamps copied elements inside slide bounds | Keyboard copy/paste | Regression deck slide 1 | Multiple pasted copies remain within slide bounds | Undo/redo not asserted | N/A | `keyboard-and-multiselect.spec.ts` |
| Object cut plus paste behaves like remove then reinsert through history | Keyboard cut/paste | Regression deck slide 1 | Original node disappears on cut; pasted copy appears with new id; successive undo removes the pasted copy and then restores the original | Undo asserted | Reload not asserted | `keyboard-and-multiselect.spec.ts` |
| Shift-click multi-select moves and deletes multiple elements as one editing batch | Stage click, shift-click, keyboard arrows, Backspace | Regression deck slide 1 | Two elements move together; one undo restores both transforms; Backspace removes both; one undo restores both | Undo asserted | N/A | `keyboard-and-multiselect.spec.ts` |
| Select all selects every top-level editable on the active slide | `Meta/Ctrl+A`, ArrowRight | Regression deck slide 1 | Selection overlay spans top-level editables; arrow move shifts top-level items while preserving nested offset inside the moved block | Undo/redo not asserted | N/A | `keyboard-and-multiselect.spec.ts` |
| Multi-select copy/paste duplicates the selected set with new ids and preserved relative offsets | Keyboard copy/paste | Regression deck slide 1 | Two pasted copies appear; nested copied-child id is absent; relative movement offset is consistent; pasted copies stay within slide bounds | Undo asserted for follow-up move only | Reload not asserted | `keyboard-and-multiselect.spec.ts` |

## Presenter And Export E2E

| Behavior currently covered | Surfaces | Fixture | What the current tests assert | History | Persistence | Test coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Entering Present mode from the editor switches to presenter UI and hides editor chrome | Header Present button | Regression deck | Presenter view becomes visible; sidebar hides; slide frame fills most of the viewport; slide root stays 1920x1080 | N/A | N/A | `presenter-mode.spec.ts` |
| Presenter toolbar visibility follows pointer activity and slide navigation works from toolbar and keyboard | Presenter toolbar, keyboard | Regression deck | Toolbar auto-hides and reappears with pointer movement; Next slide button and ArrowDown both advance page number and slide content | N/A | N/A | `presenter-mode.spec.ts` |
| Presenter laser pointer and pen controls work, including pen color and Escape clearing ink | Presenter toolbar, pointer, keyboard Escape | Regression deck | Laser cursor tracks pointer; Pen mode changes cursor, exposes colors, draws ink path, and Escape clears the drawing and exits pen mode | N/A | N/A | `presenter-mode.spec.ts` |
| Presenter fullscreen controls toggle against a stubbed fullscreen API | Presenter toolbar | Regression deck | Enter fullscreen and Exit fullscreen buttons swap correctly | N/A | N/A | `presenter-mode.spec.ts` |
| Exiting Present mode returns to the normal editor layout | Presenter toolbar Exit button | Regression deck | Presenter view hides; sidebar and stage iframe reappear; stage frame shrinks back to editor layout width | N/A | N/A | `presenter-mode.spec.ts` |
| Single HTML export opens directly in standalone presenter mode | Export menu, downloaded file | Regression deck | Downloaded HTML opens with presenter root visible; toolbar shows page count; next-slide button and slide-frame click both advance slides | N/A | Standalone reopen asserted | `presenter-mode.spec.ts` |
