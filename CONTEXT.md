# Starry Slides Context

This repository uses a single context file.

Use this file for two things only:

1. repo structure: where to look in the codebase
2. workflow rules: how changes are expected to be made and documented

## Project Overview

Starry Slides is a single-package product that edits Contract-compatible HTML
slides directly. HTML remains the persisted source of truth.

## Repository Structure

This section is just an index of where things live.

### Top-level directories

- `src/core/`
  Core slide/document logic, parsing, operations, history, HTML write-back, and
  verification.
- `src/editor/`
  Browser editor UI and interaction code.
- `src/node/`
  Node-side runtime helpers used by the app and CLI.
- `src/cli/`
  `starry-slides` CLI entrypoint and command dispatch.
- `docs/`
  Project documentation.
- `docs/adr/`
  Architecture Decision Records.
- `docs/roadmap/`
  Roadmap index and milestone plans.
- `e2e/`
  Browser E2E tests, fixtures, and deck-generation tools.
- `skills/`
  Agent-facing skill files and related tooling.

### Test locations

- `e2e/tests/`
  Playwright browser E2E specs.
- `e2e/fixtures/`
  E2E fixture inputs.
- `e2e/tools/`
  Regression deck generation and preparation scripts.
- `src/core/*.test.ts`
  Core tests.
- `src/node/*.test.ts`
  Node/runtime tests.
- `src/cli/*.test.ts`
  CLI tests.

### Local deck/runtime paths

- `sample-slides/`
  Ignored local sample deck for normal local development.
- `.e2e-test-slides/`
  Ignored temporary deck for browser E2E runs.

## Workflow Rules

### Source-of-truth rules

- HTML is the only persisted slide source of truth.
- Do not introduce a proprietary slide document model.
- Do not add feature-local persistence paths that bypass the shared HTML
  operation/write-back pipeline.
- `docs/e2e.md` is the source of truth for E2E coverage inventory.

### ADR rules

- Read relevant ADRs before changing architecture, persistence, package
  boundaries, history semantics, editor pipeline semantics, or E2E
  documentation policy.
- If a new change creates or replaces a cross-cutting decision, add or update
  an ADR under `docs/adr/`.
- Do not keep parallel “current truth” documents when an ADR or designated doc
  already owns that topic.

### Testing rules

- Use the smallest meaningful check while iterating.
- The default completion expectation is that `pnpm verify` passes unless the
  user explicitly narrows scope or accepts a known failing area.
- `pnpm verify` currently runs:
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`
  - `pnpm test:packaged-cli`
  - `pnpm test:e2e`
- If user-triggered behavior changes, add or update tests at the narrowest
  useful layer.
- Pure visual, layout-only, styling-only, motion-only, or copy-only changes do
  not need dedicated tests by default.
- Bug fixes should add regression coverage when there is a reasonable seam.

### E2E maintenance rule

- If any file under `e2e/tests/` is added, deleted, or materially changed,
  update `docs/e2e.md` in the same change.
- This includes new coverage, removed coverage, and materially narrowed or
  expanded assertions.
- Do not update `docs/e2e.md` for purely internal helper refactors unless the
  documented behavior inventory changes.

### Deck/runtime rules

- Normal local development uses `sample-slides/`.
- If `sample-slides/` is missing, recreate it with
  `pnpm editor:e2e:generate-deck`.
- E2E runs use `.e2e-test-slides/`.
- Do not add extra persistent deck copies beyond `sample-slides/` and the
  ignored E2E deck.
