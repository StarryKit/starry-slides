# Starry Slides

Starry Slides is a local-first, agent-native slide workflow: generate
Contract-compatible HTML slide decks, validate them, then open the same source
files in a browser editor for manual revision.

The product rule is simple: **HTML stays the source of truth**. Starry Slides
does not provide preset templates or a proprietary slide model. It defines the
generated deck format and provides the tools around that format: validation,
editing, presentation, saving, and future extensions.

## Why This Exists

Most slide tools start from templates or treat AI output as something to export,
flatten, or rebuild in a closed editor format. Starry Slides takes the opposite
path:

- users and agents provide the context: topic, documents, brand guidance,
  `design.md`, existing themes, other slide skills, or any useful reference
- agents generate normal deck packages with `manifest.json`, `slides/`, and
  optional `assets/`
- Starry Slides only requires a small HTML Contract so generated slides can be
  understood by tools
- the editor reads the generated HTML, lets a human revise it manually, and
  writes edits back to the same slide files

That makes the deck inspectable, versionable, testable, and still easy to edit
after generation.

## Product Shape

This repo now builds one product package:

```text
@starrykit/slides
  + generated deck package
  -> validation, local editor runtime, browser editing, saving
```

The package exposes the local CLI binary:

```bash
starry-slides [deck]
starry-slides open [deck]
starry-slides verify [deck]
starry-slides verify [deck] --static
starry-slides view [deck] --slide <manifest-file>
starry-slides view [deck] --all
starry-slides view [deck] --all --out-dir <directory>
starry-slides add-skill
```

`starry-slides [deck]` defaults to `starry-slides open [deck]`. `open` runs
Complete Verify first and only starts the browser editor when validation passes.
`verify` writes a JSON Verify Result to stdout. `view` runs Static Verify, writes
PNG previews under `<deck>/.starry-slides/view/` or an explicit `--out-dir`, and
writes a JSON Preview Manifest to stdout.

The agent-facing skill remains in `skills/starry-slides-skill/`. It owns the
deck-generation workflow and protocol references, but it should use
`starry-slides` for validation, previewing, and opening instead of owning a
separate editor runtime.

## What Works Today

The current repo is a local-first product build. It can:

- generate the regression/sample deck used by local development
- validate and annotate Contract-compatible HTML slides
- build a `manifest.json` for a slide directory
- open the browser editor against `sample-slides/` or a deck path
- edit marked text directly in the slide iframe
- select editable text, image, and block elements
- update supported CSS properties through the floating toolbar
- group and ungroup selected elements through explicit core operations
- move and resize supported block/text elements with snapping
- undo and redo committed editor operations
- save edited generated slides back to disk in the local dev server
- run unit, build, lint, and browser regression checks

This is not yet a hosted collaboration product. The local runtime expects a
Contract-compatible deck package.

## Quick Start

Install dependencies:

```bash
pnpm install
```

Create or refresh the ignored local sample deck:

```bash
pnpm editor:e2e:generate-deck
```

Validate the local sample deck:

```bash
pnpm --silent starry-slides verify sample-slides
```

Open the local sample deck:

```bash
pnpm starry-slides open sample-slides
```

For day-to-day editor development with Vite hot reload:

```bash
pnpm dev
```

`pnpm dev` starts the root Vite app and serves the deck from:

```text
sample-slides/
```

Local edits are saved back into that ignored deck while the dev server is
running.

## Common Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm lint:fix
pnpm format
pnpm test
pnpm test:e2e
pnpm verify
pnpm --silent starry-slides verify sample-slides
pnpm --silent starry-slides verify sample-slides --static
pnpm --silent starry-slides view sample-slides --slide 01-hero.html
pnpm starry-slides open sample-slides
```

`pnpm verify` is the full local gate:

```bash
pnpm lint && pnpm test && pnpm build && pnpm test:e2e
```

The browser regression suite uses a temporary ignored deck in
`.e2e-test-slides/`. Normal development uses the ignored local sample deck in
`sample-slides/`.

## Generate Or Install A Deck

A Starry Slides deck package should look like this:

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

To refresh the ignored local sample deck from the editor regression generator:

```bash
pnpm editor:e2e:generate-deck
```

## Slide Contract

Each slide is a standalone HTML document. The editor looks for DOM attributes,
not a particular CSS framework.

Minimum slide root:

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

- exactly one `data-slide-root="true"` element per slide
- editable text marked with `data-editable="text"`
- replaceable images marked with `data-editable="image"`
- selectable or movable containers marked with `data-editable="block"`

Recommended:

- `data-slide-width="1920"` and `data-slide-height="1080"` on the root
- stable `data-editor-id` values on the root and editable elements
- `data-archetype`, `data-style-pack`, `data-role`, and `data-group` where they
  help generation and editing tools preserve intent

The full v1 Contract lives in
`skills/starry-slides-skill/references/contract-protocol/contract-v1.md`.

## Repository Guide

```text
src/
  cli/                         starry-slides command parsing and process behavior
  runtime/                     local deck path resolution, ports, browser opening
  editor/
    app/                       root Vite browser app integration
    components/                editor shell, floating toolbar, canvas, UI
    hooks/                     selection, editing, keyboard, block manipulation
    lib/                       editor-only helpers and interaction models
    styles/                    Tailwind/shadcn theme entry
  core/                        Contract, parser, history, operations, import helpers

e2e/                           Playwright tests, fixtures, and deck generator
sample-slides/                 ignored local sample deck for dev and CLI default

skills/
  starry-slides-skill/         agent-facing deck workflow and protocol tools
```

## For Agents

Start here before making changes:

1. Read `CONTEXT-MAP.md`.
2. Read the relevant context docs:
   - `src/core/CONTEXT.md` for slide parsing, operations, history, and
     validation.
   - `src/editor/CONTEXT.md` for editor UI and interactions.
   - `src/runtime/CONTEXT.md` for local deck loading, save/reset behavior, and
     CLI runtime integration.
3. Read `docs/adr/README.md` and relevant ADRs before changing architecture,
   persistence, collaboration, package boundaries, history, or editor pipeline
   semantics.
4. For deck generation work, use `skills/starry-slides-skill/SKILL.md` and its
   bundled scripts.
5. Before closing implementation work, run `pnpm verify` unless the change is
   documentation-only or the user explicitly asks for a narrower check.

Agent rules that matter in this repo:

- do not introduce a proprietary slide document model
- do not bypass `src/core` operations for committed edits
- do not invent alternate built-in deck locations
- do not add extra persistent deck copies beyond `sample-slides/` and the
  ignored e2e working deck
- keep generated slides Contract-compatible and validate them with `starry-slides`

## Architecture Decisions

Important current decisions:

- ADR-0001: editing pipeline and versioning strategy
- ADR-0003: Tailwind and shadcn/ui for editor UI
- ADR-0006: shared toolbar model for element tooling
- ADR-0007: generated deck copy policy
- ADR-0008: `@starrykit/slides` single-package architecture

The ADR index is `docs/adr/README.md`.

## Roadmap

Product planning lives in `ROADMAP.md`, with milestone details in:

- `docs/roadmap/milestone-1-foundation.md`
- `docs/roadmap/milestone-2-editing-release.md`
- `docs/roadmap/milestone-3-agent-productization.md`

## License

[AGPL-3.0-only](./LICENSE)
