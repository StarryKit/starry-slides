# ADR-0008: Adopt @starrykit/slides as the single product package

- Status: accepted
- Date: 2026-05-05
- Supersedes: [ADR-0005](./0005-adopt-two-subject-skill-and-editor-architecture.md)

## Context

Starry Slides needs a first-release local workflow that a user can run from a
single command against a generated deck package:

```bash
npx -y @starrykit/slides ./deck
```

The previous accepted architecture separated the product into two external
subjects:

- `starry-slides-skill`, for agent-side generation, validation, feedback, and
  opening
- Starry Slides Editor, published as `@starry-slides/editor`, for browser
  editing and saving

That split was useful while the editor, core operations, and generated-deck
contract were being shaped. The product direction is now simpler: Starry Slides
is one local product package that validates and opens generated deck packages.
The editor UI, core document operations, local server, and CLI are implementation
modules inside that one package, not independent product boundaries.

The npm scope `@starry` is unavailable. The project will use the owned npm scope
`@starrykit` while preserving the Starry product brand.

## Decision

Adopt a single-package architecture:

```text
@starrykit/slides
  + generated deck package
  -> validation, local editor runtime, browser editing, saving
```

The repository root is the package boundary for `@starrykit/slides`. Do not keep
a `packages/` workspace solely for editor or core internals.

The package exposes one CLI binary:

```text
sslides
```

The required commands are:

```bash
sslides ./deck
sslides open ./deck
sslides verify ./deck
sslides add-skill
```

`sslides ./deck` is equivalent to `sslides open ./deck`.

`sslides open` must:

1. resolve the target deck path, defaulting to the local sample deck when no
   path is provided
2. run the same validation path used by `sslides verify`
3. print validation errors and exit non-zero when validation fails
4. start a local editor server only after validation passes
5. mount the target deck and its assets for browser loading and saving
6. open the browser editor URL

`sslides verify` must validate a deck package without starting the editor
runtime. It must report actionable errors and use a non-zero exit code when the
deck violates the contract.

`sslides add-skill` is reserved for installing or guiding installation of the
Starry Slides skill. Its exact agent-specific installation behavior can be
defined later without changing the package boundary.

## Amendment note

ADR-0011 supersedes the CLI naming and verify/view workflow details in this
ADR. The current agent-facing command target is `starry-slides`, `view` is a
subcommand of that CLI, and overflow detection is part of the normal verify
workflow.

ADR-0012 supersedes the sample deck tracking assumption in this ADR.
ADR-0026 supersedes the sample deck path assumption in this ADR. The repository
now uses `.e2e-test-slides/` as the only generated local regression deck path.

Use these internal module boundaries:

```text
src/
  cli/       command parsing and process exit behavior
  node/   local HTTP server, deck mounting, ports, browser opening, save/reset
  editor/    browser React editor UI
  core/      deck contract, import, HTML parsing, history, operations
```

`src/node` may depend on `src/core`. `src/editor` may depend on `src/core`.
`src/core` must not depend on `src/node` or `src/editor`.

The current `apps/web` runtime becomes `src/editor/app` and `src/node`
implementation. The current `packages/editor` implementation becomes
`src/editor` and `src/core` implementation.

The skill remains in `skills/starry-slides-skill/` as an agent-facing workflow
asset. It should call `sslides verify` and `sslides open` rather than owning a
separate editor-opening product boundary.

## Consequences

Benefits:

- users get one package and one command family for slides
- local and eventual npm usage match the desired product shape
- `apps/web` no longer exists as a separate app boundary whose only job is to
  host the editor package
- `@starry-slides/editor` no longer needs a public package identity before there
  is evidence that editor UI is useful as a standalone dependency
- validation and opening share one CLI-owned contract path
- packaging is simpler because the repo root is the npm package

Costs:

- the migration touches import paths, scripts, tests, Vite config, package
  metadata, and documentation
- external consumers of `@starry-slides/editor` are no longer a release target
  for this product direction
- future Starry products such as docs or image should live in separate repos or
  be introduced through a new monorepo decision when they become real

## Alternatives considered

### Keep `@starry-slides/editor` as a separate package

Rejected. The editor does not currently have independent product value apart
from opening and editing Starry Slides deck packages. Keeping it separate adds
workspace and packaging complexity without improving the first user workflow.

### Keep `apps/web` as the local host

Rejected. The web app is only a runtime shell around the editor and generated
deck loading. Those responsibilities belong inside `@starrykit/slides` as
runtime and editor app modules.

### Publish under the unavailable `@starry` scope

Rejected. The `@starry` npm scope is unavailable. `@starrykit/slides` preserves
the brand direction while using an owned namespace.

### Keep a `packages/` directory with only one package

Rejected. A single-product repo should not retain monorepo ceremony until there
are multiple real package boundaries.

## Non-goals

This decision does not:

- define the npm publishing workflow
- define the final implementation of `sslides add-skill`
- create hosted collaboration or cloud deck storage
- support arbitrary non-contract HTML
- define future `@starrykit/docs` or `@starrykit/image` package structures

## Implementation Plan

- **Package metadata**: change the root package to `@starrykit/slides`, expose
  the `sslides` binary, and remove workspace-only package metadata once root
  owns the build.
- **Directory migration**: move `packages/editor/src/*` into `src/editor/*`
  except `packages/editor/src/lib/core/*`, which moves into `src/core/*`.
- **App migration**: move `apps/web/src/*` into `src/editor/app/*`, move
  `apps/web/index.html` to the root app entry, and fold the Vite save/reset deck
  plugin into `src/node`.
- **Sample deck**: move `apps/web/public/sample-slides/` to `sample-slides/`.
- **Tests and tools**: move editor unit tests and Playwright tests under the
  root package, update test globs and generated regression deck paths, and keep
  the generated-deck E2E path.
- **CLI**: add `src/cli/index.ts` with default/open/verify/add-skill commands.
  Reuse the existing contract validator for `verify`; make `open` call `verify`
  before starting the runtime.
- **Skill tools**: update `skills/starry-slides-skill/tools/open-editor.mjs` so
  it invokes the `sslides` workflow rather than `pnpm dev`.
- **Docs**: update `CONTEXT-MAP.md`, package `CONTEXT.md` files, README, and
  this ADR index to describe the single-package product boundary.

## Verification

- [ ] `pnpm install` succeeds after removing workspace-only package references.
- [ ] `pnpm sslides verify sample-slides` validates the local sample deck.
- [ ] `pnpm sslides sample-slides` verifies and opens the local editor runtime.
- [ ] `pnpm build` builds the CLI and browser editor app.
- [ ] `pnpm test` runs core/editor unit tests after path migration.
- [ ] `pnpm test:e2e` runs against the generated deck through the root runtime.
- [ ] `pnpm verify` passes.
