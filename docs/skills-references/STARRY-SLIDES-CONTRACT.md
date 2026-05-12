# Starry Slides Contract

This document is the single source of truth for the Starry Slides deck contract in this
repository.

The contract exists so the same deck can be:

- verified and previewed by the CLI
- edited by the browser editor

The contract has three parts:

1. deck directory structure
2. `manifest.json`
3. per-slide HTML files

The contract is DOM-marker based, not CSS-framework based.

## Deck Directory Structure

A deck is a normal directory with this shape:

```text
my-deck/
  manifest.json
  slides/
    01-title.html
    02-agenda.html
    03-content.html
  assets/
    hero.png
```

Required structure:

- the deck directory must contain `manifest.json`
- the deck directory must contain a `slides/` directory
- each presentation page is stored as a standalone HTML file

## manifest.json

Each deck must include a `manifest.json` file at the deck root.

Top-level fields:

| Field         | Required | Description                                                                                    |
| ------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `slides`      | yes      | Ordered list of slides in the deck. No default. Must be present.                               |
| `deckTitle`   | yes      | Human-readable deck title. No default. Must be present.                                        |
| `description` | yes      | Human-readable deck description. No default. Must be present.                                  |
| `generatedAt` | no       | Generation or provenance timestamp. If omitted, the CLI may add it in a later write-back flow. |

Per-slide fields:

| Field       | Required | Description                                                                                        |
| ----------- | -------- | -------------------------------------------------------------------------------------------------- |
| `file`      | yes      | Deck-relative path to a slide HTML file. No default. Must be present.                              |
| `title`     | yes      | Human-readable slide title. No default. Must be present.                                           |
| `archetype` | no       | Optional slide archetype label. No archetype is assumed when omitted.                              |
| `hidden`    | no       | Whether the slide is hidden from consumers that honor visibility. Treated as `false` when omitted. |
| `notes`     | no       | Optional slide notes. No notes are assumed when omitted.                                           |

Manifest example:

```json
{
  "deckTitle": "Future of Team Workflows",
  "description": "A three-slide deck about source-native collaboration.",
  "slides": [
    {
      "file": "slides/01-title.html",
      "title": "Future of Team Workflows",
      "archetype": "title"
    },
    {
      "file": "slides/02-agenda.html",
      "title": "Why teams are changing how they ship"
    },
    {
      "file": "slides/03-content.html",
      "title": "Source-native decks are easier to trust",
      "notes": "Optional presenter note."
    }
  ]
}
```

## Each Slide HTML File

### 1. Root Node

Each slide HTML file uses its `body` element as the slide root.

- Root size may be specified only by directly setting a fixed numeric `width`
  and `height` on the `body` in CSS, such as `width: 1920px` and
  `height: 1080px`.
- If `body` size is not specified, the default root size is `1920 x 1080`.
- Any other sizing method is not part of the contract and is treated as not
  specified. This includes percentage-based sizing, viewport-based sizing,
  content-driven sizing, inherited sizing, and other indirect sizing methods.
- Root overflow is forbidden. The `body` must not allow visible or scrolling
  overflow and must not produce scroll overflow during normal rendering.

### 2. Editable Element Attributes

Every user-editable node must declare one supported editable type:

Nodes without `data-editable` are treated as non-editable. Decorative-only
layers should stay unmarked.

Editable attributes and values:

| Attribute             | Description                                                                                                                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-editable`       | Marks a node as user-editable. If `data-editable` is omitted, the node is treated as non-editable. The validity table below defines which values are currently supported and which values are not. |
| `data-editable-id`    | Optional stable identity for an editable node. Runtime normalization may derive deterministic ids when omitted.                                                                                  |
| `data-allow-overflow` | Bare optional marker that allows intentional overflow on a non-root element. This does not apply to the slide root, because root overflow is forbidden.                                         |
| `data-role`           | Provides an optional semantic hint such as `title`, `subtitle`, `body`, `caption`, `metric`, or `callout`. No semantic role is assumed when omitted.                                            |

Editable type validity:

| Value           | Supported | Meaning                                                                                                                                                                      |
| --------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text`          | yes       | Editable text node                                                                                                                                                           |
| `image`         | yes       | Replaceable image node                                                                                                                                                       |
| `block`         | yes       | Selectable or movable container node. A block may also act as a composition container whose editable children can later be flattened or regrouped through editor operations. |
| any other value | no        | Invalid editable type. May support in the future.                                                                                                                            |

## Slide HTML Example

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <style>
      * { box-sizing: border-box; }
      html {
        margin: 0;
      }
      body {
        margin: 0;
        width: 1920px;
        height: 1080px;
        overflow: hidden;
        font-family: sans-serif;
      }
      .slide {
        min-height: 100%;
        padding: 96px;
        display: grid;
        align-content: start;
        gap: 32px;
      }
    </style>
  </head>
  <body>
    <main class="slide">
      <h1 data-editable="text" data-editable-id="text-1" data-role="title">
        Future of Team Workflows
      </h1>
      <p data-editable="text" data-editable-id="text-2" data-role="body">
        Why source-native collaboration changes how teams ship.
      </p>
      <img
        data-editable="image"
        data-editable-id="image-1"
        src="../assets/hero.png"
        alt="Abstract illustration for the deck cover"
      />
      <section data-editable="block" data-editable-id="block-1">
        <p data-editable="text" data-editable-id="text-3" data-role="body">
          Source-native slides keep authored structure easy to inspect.
        </p>
        <p data-editable="text" data-editable-id="text-4" data-role="body">
          Block structure is also the basis for group and ungroup behavior.
        </p>
      </section>
    </main>
  </body>
</html>
```
