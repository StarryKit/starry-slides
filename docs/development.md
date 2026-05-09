# Development Guide

This document is the working guide for local development in this repository.

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
```

`pnpm verify` is the full local gate:

```bash
pnpm lint && pnpm test && pnpm build && pnpm test:packaged-cli && pnpm test:e2e
```

Deck-specific commands:

```bash
pnpm editor:e2e:generate-deck
pnpm --silent starry-slides verify sample-slides
pnpm --silent starry-slides verify sample-slides --static
pnpm --silent starry-slides view sample-slides --slide 01-hero.html
pnpm starry-slides open sample-slides
```

The browser regression suite uses a temporary ignored deck in
`.e2e-test-slides/`. Normal development uses the ignored local sample deck in
`sample-slides/`.

## Repository Layout

```text
src/
  cli/                         starry-slides command parsing and process behavior
  node/                     local deck path resolution, ports, browser opening
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
  starry-slides/         agent-facing deck workflow and protocol tools
```

## Implementation Boundaries

Start here before making changes:

1. Read `CONTEXT.md`.
2. Read relevant ADRs from `docs/adr/README.md` before changing architecture,
   persistence, collaboration, package boundaries, history, editor pipeline
   semantics, or E2E documentation policy.
3. For deck generation work, use `skills/starry-slides/SKILL.md` and its
   bundled scripts.

Rules that matter in this repo:

- Do not introduce a proprietary slide document model.
- Do not bypass `src/core` operations for committed edits.
- Do not invent alternate built-in deck locations.
- Do not add extra persistent deck copies beyond `sample-slides/` and the
  ignored e2e working deck.
- Keep generated slides Contract-compatible and validate them with
  `starry-slides`.

## Local Sample Deck

Create or refresh the sample deck:

```bash
pnpm editor:e2e:generate-deck
```

`pnpm dev` starts the root Vite app and serves the deck from `sample-slides/`.
Local edits are saved back into that ignored deck while the dev server is
running.
