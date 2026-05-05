# Slides Protocol v1

This document defines the single protocol layer for editable HTML slides in this repo.

## Purpose

The protocol exists to make slide HTML:

- loadable through `packages/core`
- selectable and editable through `src/editor`
- stable enough for style packs, fixtures, and generated decks to share the same document contract

The protocol is visual-style agnostic.

## Document scope

Each slide is a standalone HTML document that renders as one presentation page.

The parser/editor contract depends on DOM markers, not on a specific design system.

## Required attributes

### Slide root

Every slide must contain exactly one root element with:

```html
data-slide-root="true"
```

This root defines the editor's page boundary.

### Editable semantics

Mark every user-editable node with one of these values:

- `data-editable="text"` for user-editable text
- `data-editable="image"` for user-replaceable images
- `data-editable="block"` for user-selectable or movable content blocks

Nodes without `data-editable` are treated as non-editable by default.

Decorative-only layers should remain unmarked.

## Optional attributes and defaults

### Slide dimensions

Optional on the slide root:

- `data-slide-width`
- `data-slide-height`

Default values when omitted:

- `data-slide-width="1920"`
- `data-slide-height="1080"`

### Stable editor identity

Optional on the slide root and editable nodes:

- `data-editor-id`

Default behavior when omitted:

- the root defaults to `slide-root`
- editable nodes default to deterministic ids such as `text-1`, `image-1`, `block-1`

### Archetype hint

Optional on the slide root:

- `data-archetype`

Default when omitted:

- no archetype hint is assumed

Recommended v1 archetypes are defined in `archetypes.md`.

### Style pack hint

Optional on the slide root:

- `data-style-pack`

Default when omitted:

- no style pack name is assumed

### Semantic role

Optional on editable nodes:

- `data-role`

Examples:

- `title`
- `subtitle`
- `body`
- `caption`
- `metric`
- `callout`

Default when omitted:

- no semantic role is assumed

### Group hint

Optional on editable nodes:

- `data-group`

Default when omitted:

- no grouping is assumed

## Manifest contract

Decks should include a `manifest.json` next to the slide files.

### Required manifest fields

- `slides`
- for each slide entry:
  - `file`
  - `title`

### Optional manifest fields

- top-level `deckTitle`
- top-level `topic`
- top-level `generatedAt`
- per-slide `archetype`
- per-slide `notes`
- per-slide `stylePack`

Default behavior when omitted:

- missing optional metadata does not block parsing or editing

## Validation rules

A protocol validator should fail when:

- a slide has zero slide roots
- a slide has multiple slide roots
- an editable node uses an unknown `data-editable` value

A validator should warn when:

- the slide root omits width or height
- a slide has no editable nodes
- a slide root has no `data-archetype`
- editable images are not `<img>` elements

## Reference example

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        width: 1920px;
        height: 1080px;
      }
      body {
        overflow: hidden;
        font-family: sans-serif;
      }
      .slide {
        width: 1920px;
        height: 1080px;
        padding: 96px;
      }
    </style>
  </head>
  <body>
    <main
      class="slide"
      data-slide-root="true"
      data-slide-width="1920"
      data-slide-height="1080"
      data-archetype="title"
      data-style-pack="example-pack"
      data-editor-id="slide-root"
    >
      <h1 data-editable="text" data-role="title" data-editor-id="text-1">
        Future of Team Workflows
      </h1>
      <p data-editable="text" data-role="subtitle" data-editor-id="text-2">
        Why source-native collaboration changes how teams ship.
      </p>
    </main>
  </body>
</html>
```
