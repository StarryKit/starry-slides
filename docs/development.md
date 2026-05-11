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
pnpm --silent starry-slides view sample-slides --slide slides/01-hero.html
pnpm starry-slides open sample-slides
```

The browser regression suite uses a temporary ignored deck in
`.e2e-test-slides/`. Normal development uses the ignored local sample deck in
`sample-slides/`.

## Local Sample Deck

Create or refresh the sample deck:

```bash
pnpm editor:e2e:generate-deck
```

`pnpm dev` starts the root Vite app and serves the deck from `sample-slides/`.
Local edits are saved back into that ignored deck while the dev server is
running.
