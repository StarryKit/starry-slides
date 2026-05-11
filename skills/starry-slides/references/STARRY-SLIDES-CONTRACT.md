# Starry Slides Contract

This document is the single source of truth for the slide deck contract in this
repository.

The contract exists so the same HTML deck can be:

- loaded by `src/core`
- verified by the CLI
- previewed by `starry-slides view`
- edited by the browser editor

## Scope

A deck is a normal directory that contains `manifest.json`, a `slides/`
directory, and optional supporting assets.

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

Each slide is a standalone HTML document that renders as one presentation page.
The contract is DOM-marker based, not CSS-framework based.

## Rule 1: Every Slide Must Have Exactly One Slide Root

Each slide document must contain exactly one element with:

```html
data-slide-root="true"
```

This root defines the page boundary used by parsing, verification, preview, and
editing.

Required behavior:

- zero slide roots is invalid
- multiple slide roots is invalid

Recommended root attributes:

- `data-slide-width="1920"`
- `data-slide-height="1080"`
- `data-editor-id="slide-root"`

Default behavior when dimensions are omitted:

- width defaults to `1920`
- height defaults to `1080`

## Rule 2: Every Editable Element Must Declare Its Editable Semantics

Every user-editable node must declare one supported editable type:

- `data-editable="text"` for editable text
- `data-editable="image"` for replaceable images
- `data-editable="block"` for selectable or movable containers

Nodes without `data-editable` are treated as non-editable. Decorative-only
layers should stay unmarked.

Required behavior:

- unknown `data-editable` values are invalid

Recommended editor identity:

- editable elements should include stable `data-editor-id` values
- when omitted, tooling may derive deterministic ids such as `text-1`,
  `image-1`, or `block-1`

Recommended semantic hints:

- `data-role` for semantic intent such as `title`, `subtitle`, `body`,
  `caption`, `metric`, or `callout`
- `data-group` when related editable elements should carry a grouping hint

Warnings, not hard failures:

- a slide with no editable nodes should warn
- an editable image that is not an `<img>` element should warn

## Rule 3: Every Deck Must Be Manifest-Addressable

Decks must include a `manifest.json` beside the slide files.

Required manifest fields:

- top-level `slides`
- for each slide entry: `file`
- for each slide entry: `title`

Optional manifest fields:

- top-level `deckTitle`
- top-level `topic`
- top-level `generatedAt`
- per-slide `archetype`
- per-slide `hidden`
- per-slide `notes`
- per-slide `stylePack`

Default behavior when optional metadata is omitted:

- missing optional metadata does not block parsing or editing
- missing per-slide `hidden` is treated as `false`

When present:

- `hidden` must be a boolean
- `hidden: true` marks a slide as hidden for consumers that honor visibility
  semantics, while authoring tools may still show it for editing

## Optional Hints

These attributes are optional but recommended because they stabilize generation
and editing behavior:

- `data-archetype` on the slide root
- `data-style-pack` on the slide root
- `data-role` on editable nodes
- `data-group` on editable nodes

Default behavior when omitted:

- no archetype is assumed
- no style pack is assumed
- no semantic role is assumed
- no group hint is assumed

The canonical v1 archetypes are:

- `title`
- `section`
- `thesis`
- `concept`
- `comparison`
- `list`
- `timeline`
- `data`
- `media`
- `closing`

Guidance for archetypes:

- a style system should cover the same fixed archetype set
- decorative structure is fine, but editable content should stay clearly
  separable from decorative layers
- standard HTML and existing contract attributes should be preferred over
  inventing new protocol attributes

## Validation Summary

A validator should fail when:

- a slide has zero slide roots
- a slide has multiple slide roots
- an editable node uses an unknown `data-editable` value

A validator should warn when:

- the slide root omits width or height
- a slide has no editable nodes
- a slide root omits `data-archetype`
- an editable image is not an `<img>` element

## Reference Markup

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
      <img
        data-editable="image"
        data-role="hero"
        data-editor-id="image-1"
        src="./assets/hero.png"
        alt=""
      />
      <section data-editable="block" data-group="hero" data-editor-id="block-1">
        <p data-editable="text" data-role="body" data-editor-id="text-3">
          Movable grouped content.
        </p>
      </section>
    </main>
  </body>
</html>
```

## Contract Example

This normalized specimen deck model captures the shared v1 archetype set and
sample content used to exercise the contract:

```json
{
  "deckTitle": "Protocol Specimen Deck",
  "topic": "Future of Team Workflows",
  "author": "Starry Slides",
  "slides": [
    {
      "id": "01-title",
      "archetype": "title",
      "title": "Future of Team Workflows",
      "fields": {
        "title": "Future of Team Workflows",
        "subtitle": "Why source-native collaboration changes how teams ship.",
        "meta": "Protocol Specimen Deck"
      }
    },
    {
      "id": "02-section",
      "archetype": "section",
      "title": "The shift",
      "fields": {
        "title": "The shift",
        "subtitle": "From static documents to editable, inspectable HTML artifacts."
      }
    },
    {
      "id": "03-thesis",
      "archetype": "thesis",
      "title": "Source-native decks are easier to trust",
      "fields": {
        "title": "Source-native decks are easier to trust",
        "points": [
          "HTML stays readable in version control.",
          "Editors can preserve original structure instead of flattening it.",
          "Teams can review content and layout in the same artifact."
        ]
      }
    },
    {
      "id": "04-concept",
      "archetype": "concept",
      "title": "Protocol before automation",
      "fields": {
        "title": "Protocol before automation",
        "body": "A stable document contract makes generation, editing, validation, and rendering part of the same workflow instead of separate conversions.",
        "points": [
          "The style pack defines visual slices.",
          "The protocol defines editable semantics.",
          "Tools validate and normalize the output."
        ]
      }
    },
    {
      "id": "05-comparison",
      "archetype": "comparison",
      "title": "Schema-first vs HTML-native",
      "fields": {
        "leftTitle": "Schema-first",
        "leftPoints": [
          "Import into a private document model",
          "Round-tripping can become lossy",
          "Source and presentation drift apart"
        ],
        "rightTitle": "HTML-native",
        "rightPoints": [
          "Keep HTML as the source of truth",
          "Preserve DOM structure and semantics",
          "Edit and validate the same files"
        ],
        "summary": "The contract should reduce translation boundaries, not add more of them."
      }
    },
    {
      "id": "06-list",
      "archetype": "list",
      "title": "What teams need from deck tooling",
      "fields": {
        "title": "What teams need from deck tooling",
        "points": [
          "Clear page boundaries",
          "Predictable editable markers",
          "Stable selectors for write-back",
          "A visual system that covers common page forms"
        ]
      }
    },
    {
      "id": "07-timeline",
      "archetype": "timeline",
      "title": "Adoption path",
      "fields": {
        "title": "Adoption path",
        "milestones": [
          "Phase 1: define the protocol",
          "Phase 2: ship a starter style pack",
          "Phase 3: add validation and annotation tools"
        ]
      }
    },
    {
      "id": "08-data",
      "archetype": "data",
      "title": "Why protocol coverage matters",
      "fields": {
        "title": "Why protocol coverage matters",
        "primaryMetric": "10",
        "primaryLabel": "core archetypes in v1",
        "secondaryMetrics": [
          "1 contract",
          "3 tooling entry points",
          "0 required visual system assumptions"
        ],
        "note": "The protocol should stay smaller than the style surface built on top of it."
      }
    },
    {
      "id": "09-media",
      "archetype": "media",
      "title": "The editor should understand real slides",
      "fields": {
        "title": "The editor should understand real slides",
        "imageAlt": "Abstract specimen visual",
        "caption": "Media-heavy layouts should still expose clear editable zones."
      }
    },
    {
      "id": "10-closing",
      "archetype": "closing",
      "title": "A good style pack makes the protocol feel invisible",
      "fields": {
        "title": "A good style pack makes the protocol feel invisible",
        "body": "Authors should feel like they are choosing a design language, while the system quietly preserves editability underneath it.",
        "action": "Build style packs against the specimen deck, then map user content into those same archetypes."
      }
    }
  ]
}
```
