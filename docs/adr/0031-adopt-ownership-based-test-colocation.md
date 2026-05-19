# ADR-0031: Adopt ownership-based test colocation

- Status: accepted
- Date: 2026-05-19
- Builds on:
  - [ADR-0025](./0025-adopt-docs-e2e-md-as-the-e2e-source-of-truth.md)
  - [ADR-0029](./0029-adopt-a-compatibility-preserving-package-extraction-path.md)
  - [ADR-0030](./0030-adopt-private-product-incubation-for-core-and-editor.md)

## Context

Starry Slides is moving from a single local runtime shape toward reusable
`slides-core` and `slides-editor` packages plus a private hosted product
repository.

Before that larger product refactor, the test layout should make ownership
obvious. Today, core unit tests already live beside core source files under
`packages/slides-core/src/`, but browser E2E tests live in a top-level
`e2e/tests/` directory and CLI/runtime tests are split between top-level test
helpers and source-adjacent files.

The current Playwright suite is mostly editor behavior:

- selection and preselection
- text editing
- toolbar controls
- keyboard and multi-selection editing
- context menu behavior
- direct manipulation, resize, rotation, grouping, and flattening
- sidebar and header editor chrome
- presenter mode launched from the editor
- deck-local asset rendering in the editor

Some current E2E cases also touch the local host/runtime through editor UI
flows, including reset, manifest loading, deck import/switching, save
persistence, and export endpoints. Those flows still belong to the editor E2E
suite during the current architecture, but they must be described as editor
integration tests that run against a host harness, not as pure browser-only
package tests.

If tests remain grouped mostly by test type, future agents have to infer which
package owns each test. That is especially risky while private product work will
periodically sync `slides-core` and `slides-editor` changes back to the
open-source repository.

## Decision

Organize tests by the source area whose behavior they prove.

The target ownership model is:

1. Core tests live with `packages/slides-core`.
2. Editor browser E2E tests live with `packages/slides-editor`.
3. CLI tests live with `src/cli`.
4. Node runtime, export, rendering, and middleware tests live with `src/node`.
5. Shared test fixtures and helpers may live in a small shared test-support
   location only when more than one owner genuinely uses them.

The current browser E2E specs under `e2e/tests/*.spec.ts` should move under the
editor package because they primarily verify editor behavior. The editor package
may own an E2E host harness used only for tests. That harness may exercise the
same local runtime endpoints the current tests need, but this must not make
`packages/slides-editor` directly depend on the production CLI or private
product backend.

Recommended target layout:

```text
packages/slides-core/
  src/
    *.ts
    *.test.ts

packages/slides-editor/
  src/
    *.ts
    *.tsx
    *.test.ts
    *.test.tsx
  e2e/
    tests/
    helpers/
    fixtures/
    test-app/
    playwright.config.ts

src/cli/
  *.ts
  *.test.ts

src/node/
  *.ts
  *.test.ts

tests/
  helpers/
```

The top-level `e2e/` directory should stop being the long-term home for editor
E2E specs after the migration. It may remain temporarily during the transition
or keep only repository-level E2E tests that do not belong to a package.

`docs/e2e.md` remains the source of truth for current E2E coverage inventory
under ADR-0025. Moving E2E files without changing assertions still requires
updating `docs/e2e.md` if the documented test paths or suite ownership change.

## Consequences

Benefits:

- future package refactors can move source and tests together
- agents can infer ownership from file location instead of global test folders
- editor package changes can run the editor-owned browser suite directly
- private product synchronization can identify public editor/core tests more
  easily
- the root repository has fewer ambiguous test boundaries

Costs:

- Playwright configuration must support an editor-package E2E suite
- existing import paths from E2E helpers and regression-deck fixtures must be
  updated
- current docs and scripts that assume `e2e/tests/` must change during the
  migration
- editor E2E will still need a host harness, so the package test setup becomes
  more explicit

Deferred:

- whether product-specific workspace/auth/Agent E2E tests live under
  `apps/product/e2e/` in the private product repository
- whether top-level repository E2E is removed entirely or retained for
  compatibility-package smoke tests
- whether shared regression deck generation remains top-level or moves into
  editor test support

## Alternatives considered

### Keep all browser E2E at the repository root

Rejected as the long-term direction.

This keeps the current Playwright setup simple, but it hides the fact that the
suite mostly belongs to `slides-editor`. It also makes future package sync and
product refactors harder to reason about.

### Move only "pure" editor E2E into the editor package

Rejected for now.

The current editor E2E suite is tightly coupled through common fixtures,
helpers, reset behavior, and a single host app. Splitting it before the product
refactor would create more harness complexity than ownership clarity.

The distinction should instead be documented inside the editor E2E suite:
pure editor interaction specs and editor-host integration specs may both live
under `packages/slides-editor/e2e/`.

### Keep tests grouped by type

Rejected.

Type-based grouping works for small repositories, but Starry Slides is becoming
a workspace where package ownership matters. Ownership-based grouping better
supports package extraction, private-product incubation, and periodic
open-source sync.

### Move all tests into package directories immediately

Deferred.

This ADR records the target architecture. The actual migration should happen in
a focused follow-up change so path moves, Playwright config, scripts, and
coverage documentation can be reviewed together.

## Non-goals

This ADR does not:

- move the test files immediately
- change E2E assertion scope or add new coverage
- replace `docs/e2e.md` as the E2E coverage inventory
- require `slides-editor` to become independent of every test host endpoint
  before the migration
- define product-specific hosted app E2E layout beyond the ownership principle
- change the core editing pipeline, persistence semantics, or package public
  APIs

## Implementation Plan

- **Editor E2E migration**:
  - move current editor-owned browser specs from `e2e/tests/` to
    `packages/slides-editor/e2e/tests/`
  - move or recreate E2E helpers under `packages/slides-editor/e2e/helpers/`
    when they are editor-specific
  - keep current editor regression fixtures with the editor E2E suite unless
    they are also used by non-editor owners
  - introduce or move a test host app under `packages/slides-editor/e2e/test-app/`
    if needed to keep the package's Playwright suite self-contained
  - classify host-dependent specs by filename, folder, or comments as editor
    integration specs rather than pure editor component specs

- **CLI and runtime test colocation**:
  - keep CLI command parsing, packaged CLI, and CLI behavior tests beside
    `src/cli`
  - keep local runtime, export, PDF, HTML, source-file packaging, deck mounting,
    and middleware tests beside `src/node`
  - do not move Node runtime tests into `packages/slides-editor` just because an
    editor E2E flow calls the same endpoint through UI

- **Shared helpers**:
  - keep broadly shared fixture builders in `tests/helpers/` only when multiple
    owners import them
  - otherwise move helpers to the owning package or source area
  - avoid test helper imports that make reusable packages depend on product-only
    paths

- **Scripts and config**:
  - update `playwright.config.ts` or add
    `packages/slides-editor/e2e/playwright.config.ts` so editor E2E can run from
    its package-owned location
  - update `package.json` scripts so `pnpm test:e2e` still runs the expected
    browser suite
  - update any `test:e2e:prepare` or regression-deck generation paths that
    assume top-level `e2e/`

- **Documentation**:
  - update `docs/e2e.md` in the same change as the file migration so test paths
    and suite ownership remain accurate
  - update `CONTEXT.md` if the repository structure section still points agents
    at the old E2E locations
  - keep this ADR focused on ownership. Do not duplicate the full coverage
    matrix here.

## Verification

- [ ] core tests remain colocated with `packages/slides-core` source files
- [ ] editor-owned Playwright specs live under `packages/slides-editor/e2e/`
- [ ] editor E2E can be run through the repository's normal E2E command
- [ ] CLI tests live beside `src/cli` and still cover CLI behavior
- [ ] Node runtime/export tests live beside `src/node` and still cover runtime
      behavior
- [ ] shared helpers are used only where cross-owner sharing is real
- [ ] `docs/e2e.md` reflects the migrated E2E paths and remains the current
      coverage inventory
- [ ] `CONTEXT.md` points future agents to the updated test locations
- [ ] the migration does not introduce product-only imports into
      `packages/slides-core` or `packages/slides-editor`
