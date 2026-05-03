# Starry Slides — Project Proposal

## Project Overview

An open source HTML slides editor with two parts:

1. **Skill**: use AI to generate marked-up HTML slides
2. **Editor**: a visual editor built on top of iframe + Konva that can directly edit AI-generated HTML slides

The core inspiration comes from the way Genspark appears to implement slide editing, based on reverse engineering and browser inspection.

---

## Background And Motivation

### Current Landscape

- AI-generated HTML slides are already mainstream across products like Genspark, Gamma, and Chronicle
- But there is still **no open source solution** that can provide true WYSIWYG editing for arbitrary HTML slides
- Existing editors such as PPTist and Polotno rely on their own private document formats and cannot directly edit raw HTML slides

### How Genspark Appears To Work

Inspection through Chrome DevTools suggests that Genspark uses a two-layer architecture:

```
┌─────────────────────────────────────┐
│  Konva Canvas Layer (transparent)   │  ← selection, drag, resize handles, toolbar
├─────────────────────────────────────┤
│  iframe + HTML Slide (content)      │  ← original AI-generated HTML for rendering
└─────────────────────────────────────┘
```

Key evidence:
- `window.Konva` is present, and `typeof Konva === 'object'`
- Console output shows coordinate conversion logic similar to:
  `iframe(x, y) + element(w, h) * scale = border position`
- Move operations appear to locate elements inside the iframe via CSS selectors and write back `transform: translate()`

---

## Technical Approach

### Core Architecture

```
AI Skill (generation)
    │
    │  outputs HTML with data-editable markers
    ▼
HTML Slides file
    │
    ▼
┌─────────────────────────────────────────────────────┐
│                   Editor App (React)                │
│                                                     │
│   ┌──────────────┐    ┌──────────────────────────┐  │
│   │  Slide List  │    │     Edit Canvas Area     │  │
│   │  (thumbnails)│    │                          │  │
│   │              │    │  ┌────────────────────┐  │  │
│   │  [Slide 1]   │    │  │  Konva Canvas      │  │  │
│   │  [Slide 2]   │    │  │  (interaction)     │  │  │
│   │  [Slide 3]   │    │  ├────────────────────┤  │  │
│   │  ...         │    │  │  iframe            │  │  │
│   └──────────────┘    │  │  (HTML rendering)  │  │  │
│                       │  └────────────────────┘  │  │
│                       └──────────────────────────┘  │
│                                                     │
│   ┌──────────────────────────────────────────────┐  │
│   │ Toolbar (rich text controls near selection)  │  │
│   └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Data Flow

```
1. Load HTML
   → Parser scans all data-editable elements
   → Builds a JSON data model

2. User interaction
   → Konva detects click / drag
   → Coordinates are converted (Konva space → iframe space)
   → The target data-editable element is located
   → The JSON data model is updated
   → Changes are written back into the iframe DOM

3. Save
   → JSON data model → serialize back to HTML
   → or directly persist the modified HTML string
```

---

## Skill Specification

### Generation Rules

When the AI skill generates HTML slides, it **must** follow these rules:

Editable elements that users may modify should include a `data-editable` attribute:

```html
<!-- text -->
<h1 data-editable="text">Title</h1>
<h2 data-editable="text">Subtitle</h2>
<p data-editable="text">Body content</p>
<span data-editable="text">Inline text</span>

<!-- image -->
<img data-editable="image" src="..." />

<!-- container / movable block -->
<div class="card" data-editable="block">...</div>
```

Non-editable decorative elements should not include any marker:

```html
<div class="grid-bg"></div>
<div class="glow-orb"></div>
<div class="divider"></div>
```

### HTML Slide Structure

Each slide should be an independent HTML file, or an independent HTML string, with a structure like this:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    /* fixed slide size: 1920x1080 */
    body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; }
    .slide-container { width: 100%; height: 100%; position: relative; }
  </style>
</head>
<body>
  <div class="slide-container">
    <!-- decorative layer -->
    <div class="bg-gradient"></div>

    <!-- content layer -->
    <h1 data-editable="text">Slide Title</h1>
    <p data-editable="text">Slide content goes here</p>
  </div>
</body>
</html>
```

---

## Editor Implementation Details

### Tech Stack

```
React          → application shell
Konva.js       → interaction layer (selection box, drag, resize handles)
TipTap         → rich text editing
iframe         → HTML slide rendering container
```

### Core Modules

#### 1. Parser — HTML To JSON Data Model

```typescript
interface EditableElement {
  id: string
  selector: string        // CSS selector used to locate the element in the iframe
  type: 'text' | 'image' | 'block'
  content: string         // current content
  transform: {
    x: number
    y: number
  }
  styles: {
    fontSize?: number
    color?: string
    fontWeight?: string
    // ...
  }
}

interface SlideModel {
  id: string
  htmlSource: string      // original HTML source string
  elements: EditableElement[]
}

function parseSlide(html: string): SlideModel {
  // 1. Parse HTML and find all [data-editable] elements
  // 2. Extract selector, content, current transform, and styles
  // 3. Return a structured data model
}
```

#### 2. Coordinate Bridge — The Hardest Technical Piece

```typescript
interface CoordBridge {
  // iframe position inside the outer container
  iframeRect: DOMRect
  // native slide size (1920x1080)
  slideNativeSize: { width: number; height: number }
  // current zoom scale
  scale: number
}

function elementToKonvaCoords(
  elementRect: DOMRect,  // element position inside the iframe
  bridge: CoordBridge
): { x: number; y: number; width: number; height: number } {
  return {
    x: bridge.iframeRect.left + elementRect.left * bridge.scale,
    y: bridge.iframeRect.top + elementRect.top * bridge.scale,
    width: elementRect.width * bridge.scale,
    height: elementRect.height * bridge.scale,
  }
}

function konvaToIframeCoords(
  konvaX: number,
  konvaY: number,
  bridge: CoordBridge
): { x: number; y: number } {
  return {
    x: (konvaX - bridge.iframeRect.left) / bridge.scale,
    y: (konvaY - bridge.iframeRect.top) / bridge.scale,
  }
}
```

#### 3. Selection And Dragging

```typescript
// user clicks on the Konva canvas
konvaStage.on('click', (e) => {
  const iframeCoord = konvaToIframeCoords(e.evt.clientX, e.evt.clientY, bridge)

  // locate the element inside the iframe
  const el = iframeDoc.elementFromPoint(iframeCoord.x, iframeCoord.y)
  if (!el || !el.dataset.editable) return

  // find the corresponding model entry
  const elementModel = findElementByDomNode(el, slideModel)

  // draw the selection box in Konva
  const konvaCoords = elementToKonvaCoords(el.getBoundingClientRect(), bridge)
  showTransformer(konvaCoords)
})

// user drags the selection
konvaTransformer.on('dragmove', (delta) => {
  // 1. update the JSON model
  elementModel.transform.x += delta.x / bridge.scale
  elementModel.transform.y += delta.y / bridge.scale

  // 2. write the change back to the iframe DOM
  const el = iframeDoc.querySelector(elementModel.selector)
  el.style.transform = `translate(${elementModel.transform.x}px, ${elementModel.transform.y}px)`
})
```

#### 4. Text Editing

```typescript
// double click to enter text editing mode
konvaStage.on('dblclick', (e) => {
  const el = getEditableElement(e, bridge)
  if (el?.dataset.editable !== 'text') return

  // hide Konva selection
  hideTransformer()

  // mount TipTap over the target area
  const rect = elementToKonvaCoords(el.getBoundingClientRect(), bridge)
  showTipTapEditor({
    position: rect,
    initialContent: el.innerHTML,
    onUpdate: (newContent) => {
      // update JSON model
      elementModel.content = newContent
      // sync back to iframe DOM
      el.innerHTML = newContent
    }
  })
})
```

#### 5. Undo / Redo

```typescript
// history stack based on the JSON model
const history: SlideModel[] = []
let historyIndex = 0

function applyChange(mutation: () => void) {
  mutation()
  // save a snapshot
  history.splice(historyIndex + 1)
  history.push(deepClone(slideModel))
  historyIndex++
}

function undo() {
  if (historyIndex <= 0) return
  historyIndex--
  restoreFromModel(history[historyIndex])
}

function redo() {
  if (historyIndex >= history.length - 1) return
  historyIndex++
  restoreFromModel(history[historyIndex])
}
```

---

## Proposed Project Structure

```
starry-slides/
├── packages/
│   ├── skill/                    # AI skill for generating HTML slides
│   │   ├── SKILL.md              # skill specification / prompt contract
│   │   ├── examples/             # generated examples
│   │   └── templates/            # reusable slide templates
│   │
│   └── editor/                   # editor application (React)
│       ├── src/
│       │   ├── components/
│       │   │   ├── SlideList/    # left-side thumbnail list
│       │   │   ├── EditCanvas/   # main editing area (iframe + Konva)
│       │   │   │   ├── IframeLayer.tsx
│       │   │   │   ├── KonvaLayer.tsx
│       │   │   │   └── CoordBridge.ts   # coordinate conversion core
│       │   │   ├── Toolbar/      # rich text toolbar
│       │   │   └── TextEditor/   # TipTap text editor
│       │   │
│       │   ├── core/
│       │   │   ├── parser.ts     # HTML → JSON model
│       │   │   ├── serializer.ts # JSON model → HTML
│       │   │   ├── history.ts    # undo / redo
│       │   │   └── types.ts      # type definitions
│       │   │
│       │   └── App.tsx
│       │
│       ├── package.json
│       └── vite.config.ts
│
├── README.md
└── package.json                  # monorepo root config
```

---

## Development Priorities

### Phase 1 — MVP

- [ ] Skill: generate HTML slides with `data-editable` markers
- [ ] Editor: load an HTML slide inside an iframe
- [ ] Editor: overlay Konva and show selection boxes on `data-editable` elements
- [ ] Editor: drag elements and write transforms back
- [ ] Editor: double click to edit text with a basic inline/contenteditable flow
- [ ] Editor: slide thumbnail list on the left, with navigation

### Phase 2 — Better Editing

- [ ] JSON data model with parser + serializer
- [ ] undo / redo based on model history
- [ ] rich text toolbar for font, size, color, weight, and more
- [ ] resize handles for editable elements
- [ ] image editing support

### Phase 3 — Expansion

- [ ] export to PDF
- [ ] export to PPTX, potentially via `dom-to-pptx`
- [ ] presentation mode / fullscreen playback
- [ ] collaborative editing based on the JSON model and WebSocket sync

---

## Hard Problems And Practical Solutions

| Problem | Approach |
| --- | --- |
| Coordinate mapping between iframe and outer canvas | Use `getBoundingClientRect()` for iframe position and apply linear scale conversion |
| Selection box drift after zoom changes | Recompute Konva object positions when scale changes, via `ResizeObserver` |
| Accumulating drag transforms safely | Store `{x, y}` in the JSON model and apply deltas there instead of reading computed styles |
| Cursor and editing behavior for text | Mount TipTap over the target region, then sync content back to both DOM and model |
| Cross-origin issues inside iframe | Use `srcdoc` with injected HTML in local development |
| Non-unique CSS selectors for editable nodes | Generate a stable `data-editable-id` during parsing |

---

## References

- Genspark slide editor, as architectural inspiration inferred through DevTools inspection
- [Konva.js Transformer docs](https://konvajs.org/docs/select_and_transform/Basic_demo.html)
- [TipTap](https://tiptap.dev/)
- [dom-to-pptx](https://github.com/atharva9167j/dom-to-pptx) for future PPTX export work
