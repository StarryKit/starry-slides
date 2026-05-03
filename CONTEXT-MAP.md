# Context Map

`starry-slides` edits HTML slides directly in the browser without converting
them into a proprietary document model.

The product rule is simple: HTML stays the source of truth.

## Working Agreement

Every implementation task is only complete when the full verification command
passes:

- `pnpm verify`

`pnpm verify` currently runs:

- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm test:e2e`

Run it before closing a task, even for small UI fixes or document changes that
affect product workflow expectations.

## Shared Testing Expectations

Default rule: any user-triggered interaction that changes editor state,
selection state, editing state, history state, or persisted document content
should add or update tests.

Refinement for UI work:

- pure visual, layout-only, styling-only, motion-only, or copy-only UI changes
  do not need dedicated tests
- UI changes should add tests only when they introduce or change real
  interaction behavior, editing behavior, functional workflow, persistence
  behavior, or state transitions
- moving labels, changing visual hierarchy, changing static icons, or polishing
  motion without changing behavior should not add coverage by default

Use this coverage bar:

- each interaction feature should have at least one happy-path test
- each interaction feature should have at least one protection test for
  misfire, data loss, or unwanted state changes
- each bug fix should add a regression test when there is a reasonable seam

Choose the narrowest useful test layer:

- browser tests for end-to-end interaction flows
- `packages/core` tests for parsing, operations, HTML write-back, and inversion
  logic
- pure visual or copy-only changes do not require tests unless they touch a
  critical interaction

Current browser regression policy:

- `pnpm test:e2e` must generate a fresh deck with `skills/html-slides-generator`
- the app must load that generated deck through the normal manifest import path
- E2E coverage should prefer this generated-deck path over sample-slide-only
  shortcuts
- when a change is considered complete, the default expectation is that
  `pnpm verify` has been run successfully

## Shared Product Terms

Use these repo terms consistently:

- `slide`
- `slide root`
- `editable element`
- `htmlSource`
- `editor`
- `generated deck`

## Shared Planning

- [ROADMAP.md](/Users/haichao/code/starry-slides/ROADMAP.md) is the single
  shared roadmap for the whole repo
- package `CONTEXT.md` files should reference the roadmap when needed, but
  should only define package boundaries, package-specific constraints, and
  package-local terminology

## Contexts

- [packages/core/CONTEXT.md](/Users/haichao/code/starry-slides/packages/core/CONTEXT.md)
  — slide model, parsing, normalization, HTML mutation, operations, shared
  history, geometry, import helpers
- [packages/editor/CONTEXT.md](/Users/haichao/code/starry-slides/packages/editor/CONTEXT.md)
  — editor UI, overlays, selection, inspector, text editing, future CSS/layout
  editing interactions
- [apps/web/CONTEXT.md](/Users/haichao/code/starry-slides/apps/web/CONTEXT.md)
  — app composition, generated-deck loading policy, runtime integration

## Shared Decisions

- [docs/adr/README.md](/Users/haichao/code/starry-slides/docs/adr/README.md)
  indexes cross-context ADRs
- [docs/adr/0001-editing-pipeline-and-versioning.md](/Users/haichao/code/starry-slides/docs/adr/0001-editing-pipeline-and-versioning.md)
  defines the editing pipeline
- [docs/adr/0002-package-boundaries-for-core-editor-and-app.md](/Users/haichao/code/starry-slides/docs/adr/0002-package-boundaries-for-core-editor-and-app.md)
  defines package boundaries

## Reading Guide

- for document model, operations, history, geometry, or persistence questions,
  start with `packages/core/CONTEXT.md`
- for user interactions and editor behavior, start with
  `packages/editor/CONTEXT.md`
- for application loading and integration behavior, start with
  `apps/web/CONTEXT.md`
- when a question changes editing architecture, persistence semantics,
  collaboration direction, or package boundaries, read `docs/adr/` first
- for roadmap or milestone order questions, read `ROADMAP.md`
