# HTML Slides Editor

A monorepo for generating and editing HTML slides without converting them into a proprietary document model.

Idea docs:

- [idea.en.md](./idea.en.md)
- [idea.zh.md](./idea.zh.md)

## Workspace

```text
apps/
  web/                         React + Vite app
packages/
  core/                        Slide contract, parser, import, update helpers
  editor/                      Editor UI that applies core operations
skills/
  html-slides-generator/       Local slide generator skill
```

## Development

```bash
pnpm install
pnpm dev
```

`pnpm dev` runs linked watch mode for `packages/core`, `packages/editor`, and `apps/web`.

Other useful commands:

```bash
pnpm build
pnpm lint
pnpm test:e2e
```

`pnpm test:e2e` runs the browser regression suite, including direct text editing coverage.
It first generates a fresh project-overview deck with `skills/html-slides-generator`, syncs that output into the app, then runs the editor against the generated deck end to end.

## Generate Slides

The current skill is a local generator that writes standalone HTML slides and syncs the latest deck into the app.
The default output is now a richer project-overview deck that also serves as a broad regression fixture with tables, charts, images, timelines, and other mixed-content layouts.

```bash
pnpm generate:slides -- --topic "Your topic"
```

Optional example:

```bash
pnpm generate:slides -- \
  --topic "HTML Slides Editor" \
  --summary "A starter deck with editable markers." \
  --points "Problem|Approach|First milestone"
```

This command:

- writes the deck to `generated/<topic-slug>/`
- writes `manifest.json` next to the slide files
- syncs the latest output to `apps/web/public/generated/current/`

The app loads `apps/web/public/generated/current/manifest.json` through a core import helper. A generated deck is required for the app to render slides.

## Slide Contract

Each slide must follow this contract:

- exactly one slide root marked with `data-slide-root="true"`
- the root must include `data-slide-width="1920"` and `data-slide-height="1080"`
- editable content must use `data-editable="text"`, `data-editable="image"`, or `data-editable="block"`

Example:

```html
<div
  class="slide-container"
  data-slide-root="true"
  data-slide-width="1920"
  data-slide-height="1080"
>
  <h1 data-editable="text">Slide title</h1>
  <p data-editable="text">Slide body</p>
</div>
```

## License

[AGPL-3.0-only](./LICENSE)
