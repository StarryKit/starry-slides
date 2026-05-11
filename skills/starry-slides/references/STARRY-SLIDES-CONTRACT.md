---
description: HTML contract for Starry Slides single-file decks
version: 2
---

# Slides Contract

This document defines the HTML contract for Starry Slides.

The same deck file should be usable by both product runtimes and agent tooling:

- the editor/presenter runtime can load and parse the file, and also can edit and write it back to the file
- AI agents can verify it and generate previews from it with supported CLI tooling


## Overview

A deck is one self-contained HTML file plus optional supporting assets.

```text
single-file.html
├── <style>          deck-level CSS (required — includes slide sizing)
├── <slides>
│   ├── <slide> ... </slide>
│   └── <slide> ... </slide>
└── assets           images, inline BASE64 or remote URLs
```

The contract is built around two custom tags and their required CSS:

- `<slides>` is the deck root and carries deck-level metadata
- `<slide>` is one presentation page and carries slide-level metadata
- CSS defines how these tags render — custom tag attributes alone do not produce layout


## `<slides>`

`<slides>` is the root container for the deck. It defines deck-level metadata.

| Property       | Required | Type                     | Default         | Description                                |
| -------------- | -------- | ------------------------ | --------------- | ------------------------------------------ |
| `title`        | no       | string                   | `Untitled deck` | Human-readable title for the deck.         |
| `description`  | no       | string                   | empty           | Description or summary of the deck.        |
| `generated-at` | no       | ISO-8601 datetime string | empty           | Timestamp for when the deck was generated. |


## `<slide>`

`<slide>` represents one slide page. It carries slide-level metadata and the
authored slide content itself.

Editing support is determined by a contract-level tag whitelist. Elements in the
supported tag list are currently editable. Elements outside the list are
currently treated as non-editable authored content.

`data-editable` is not part of this contract and must not appear in authored
deck HTML.

| Property       | Required | Type              | Default | Description                                                           |
| -------------- | -------- | ----------------- | ------- | --------------------------------------------------------------------- |
| `id`           | yes      | string            | none    | Stable identifier for the slide.                                      |
| `title`        | yes      | string            | none    | Human-readable slide title.                                           |
| `slide-hidden` | no       | `true` or `false` | `false` | Visibility flag for runtimes that support hidden slides.              |
| `archetype`    | no       | string            | empty   | Optional archetype hint such as `title`, `comparison`, or `timeline`. |
| `notes`        | no       | string            | empty   | Optional presenter or authoring notes.                                |


## CSS Requirements

Custom HTML tags (`slides`, `slide`) are not rendered by the browser without
CSS. The deck file MUST include a `<style>` block that defines how these tags
render.

### Required CSS

The following CSS properties MUST be present for the deck to render correctly:

**`slides`**

| Property  | Required Value | Reason                                      |
| --------- | -------------- | ------------------------------------------- |
| `display` | `block`        | Custom tags default to inline without this. |

**`slide`**

| Property   | Required Value | Reason                                             |
| ---------- | -------------- | -------------------------------------------------- |
| `display`  | `block`        | Custom tags default to inline without this.        |
| `width`    | e.g. `1920px`  | Defines the slide viewport width.                  |
| `height`   | e.g. `1080px`  | Defines the slide viewport height.                 |
| `overflow` | `hidden`       | Prevents slide content from spilling into the next slide. |
| `position` | `relative`     | Establishes a positioning context for child elements. |

**`body`**

| Property  | Required Value | Reason                                        |
| --------- | -------------- | --------------------------------------------- |
| `margin`  | `0`            | Removes default browser margin around slides. |

### Recommended CSS

The following are recommended but not required:

| Selector | Property          | Suggested Value                         | Reason                              |
| -------- | ----------------- | --------------------------------------- | ----------------------------------- |
| `*`      | `box-sizing`      | `border-box`                            | Consistent sizing across elements.  |
| `body`   | `font-family`     | e.g. `"Avenir Next", "Segoe UI", sans-serif` | Base font for the deck.            |
| `body`   | `overflow`        | `hidden`                                | Prevents body-level scrollbars.     |

### Example

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  overflow: hidden;
  font-family: "Avenir Next", "Segoe UI", sans-serif;
}

slides {
  display: block;
}

slide {
  display: block;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  position: relative;
}
```

The slide dimensions (`width` and `height` on `slide`) define the rendering
viewport. Common values are `1920px × 1080px` (16:9) or `1440px × 1080px`
(4:3). The deck may use any consistent dimensions.


## Editable Tags

These tags are currently supported as editable elements inside `<slide>`.

### Text Editables

`a`, `b`, `blockquote`, `caption`, `cite`, `code`, `dd`, `dt`, `em`,
`figcaption`, `h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `i`, `label`, `li`, `mark`,
`p`, `pre`, `small`, `span`, `strong`, `td`, `th`, `time`

### Block Editables

`article`, `aside`, `button`, `details`, `dialog`, `div`, `dl`, `figure`,
`footer`, `form`, `header`, `main`, `nav`, `ol`, `section`, `summary`, `table`,
`tbody`, `tfoot`, `thead`, `tr`, `ul`

### Image Editables

`canvas`, `img`, `svg`, `video`

## Non-Editable Tags

Any tag not listed in the editable tag whitelist is currently non-editable.

This includes:

- custom elements not explicitly added to the whitelist
- structural wrapper elements outside the whitelist
- metadata/runtime tags such as `<script>`, `<style>`, `<link>`, and `<meta>`

## Group Semantics

`data-group="true"` is runtime metadata for block grouping and is only valid on
supported block-editable tags.

## Asset Sources

Asset source handling is expressed through normal HTML semantics.

Asset elements such as `<img>` or `<video>` may point to:

- remote URLs
- relative local paths
- inline data URLs such as base64-encoded media

The runtime should use whatever src the authored document provides.
