# Slide Contract Guide

A Starry Slides deck is a normal directory of HTML slides plus a manifest.

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

Useful protocol commands:

```bash
pnpm --silent starry-slides verify path/to/deck
pnpm starry:contract:annotate -- --input path/to/deck
pnpm starry:contract:manifest -- --input-dir path/to/deck/slides --deck-title "My Deck"
pnpm --silent starry-slides view path/to/deck --all
pnpm starry-slides open path/to/deck
```

## Minimum Slide Markup

Each slide is a standalone HTML document. The editor looks for DOM attributes,
not a particular CSS framework.

```html
<main
  data-slide-root="true"
  data-slide-width="1920"
  data-slide-height="1080"
  data-editor-id="slide-root"
>
  <h1 data-editable="text" data-editor-id="text-1">Slide title</h1>
  <p data-editable="text" data-editor-id="text-2">Slide body</p>
  <img data-editable="image" data-editor-id="image-1" src="./assets/hero.png" alt="" />
  <section data-editable="block" data-editor-id="block-1">
    <p data-editable="text" data-editor-id="text-3">Movable group</p>
  </section>
</main>
```

Required:

- Exactly one `data-slide-root="true"` element per slide.
- Editable text marked with `data-editable="text"`.
- Replaceable images marked with `data-editable="image"`.
- Selectable or movable containers marked with `data-editable="block"`.

Recommended:

- `data-slide-width="1920"` and `data-slide-height="1080"` on the root.
- Stable `data-editor-id` values on the root and editable elements.
- `data-archetype`, `data-style-pack`, `data-role`, and `data-group` where they
  help generation and editing tools preserve intent.

The full v1 Contract lives in
`skills/starry-slides/references/contract-protocol/contract-v1.md`.
