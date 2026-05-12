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
pnpm prepare:regression-deck
pnpm --silent starry-slides verify .e2e-test-slides
pnpm --silent starry-slides view .e2e-test-slides --slide slides/01-hero.html
pnpm starry-slides open .e2e-test-slides
```

The browser regression suite and normal local development both use the ignored
generated deck in `.e2e-test-slides/`.

## Local Regression Deck

Create or refresh the local regression deck:

```bash
pnpm prepare:regression-deck
```

`pnpm dev` starts the root Vite app and serves the deck from
`.e2e-test-slides/`. Local edits are saved back into that ignored deck while
the dev server is
running.
