# ADR-0026: Adopt single generated regression deck path

- Status: accepted
- Date: 2026-05-11
- Supersedes:
  - [ADR-0007](./0007-limit-generated-deck-copies.md)
  - [ADR-0012](./0012-keep-sample-slides-out-of-project-git.md)

## Context

The repository currently keeps two ignored generated deck directories for the
same regression content:

- `.e2e-test-slides/`
- `sample-slides/`

That split creates unnecessary copying and muddles the default local runtime
path. The browser E2E flow already uses `.e2e-test-slides/`, while normal
development and some CLI defaults still point at `sample-slides/`.

The product does not need two local generated copies of the same regression
deck. Maintaining both paths adds script branches, runtime selection logic, and
documentation overhead without improving the local workflow.

## Decision

Use `.e2e-test-slides/` as the only generated local regression deck path in
this repository.

`pnpm prepare:regression-deck` must generate `.e2e-test-slides/` only and
serve as the single documented regeneration command.

Normal local development, CLI default deck resolution, browser E2E runs, and
manual local editor testing must all use `.e2e-test-slides/`.

Remove `sample-slides/` from the repository workflow and stop treating it as a
default local deck path.

## Consequences

Benefits:

- one canonical generated deck path for local dev, E2E, and manual regression
  testing
- no sync step between duplicated generated deck directories
- less runtime branching in Vite and CLI defaults
- fewer stale docs and fewer path-specific mistakes in local workflows

Costs:

- developers who previously opened `sample-slides/` must switch to
  `.e2e-test-slides/`
- old historical ADRs and notes need explicit supersession so readers do not
  mistake them for current policy

## Alternatives considered

### Keep both `.e2e-test-slides/` and `sample-slides/`

Rejected. It preserves duplicate generated content and keeps the dev/runtime
story harder to follow.

### Keep `sample-slides/` as the local dev default and reserve `.e2e-test-slides/` for E2E only

Rejected. It keeps two copies of the same regression deck and forces extra
generation or sync behavior for no product benefit.

## Non-goals

This decision does not:

- define a multi-project or user-managed deck storage model
- change the deck HTML contract
- prevent explicit CLI calls from opening any user-specified deck path
- change the regression deck fixture contents

## Implementation Plan

Affected paths:

- `src/node/deck-source.ts`
- `vite.config.ts`
- `package.json`
- `e2e/tools/prepare-regression-deck.mjs`
- `e2e/tools/generate-regression-deck.mjs`
- `src/cli/index.test.ts`
- `src/core/generated-deck.test.ts`
- `docs/development.md`
- `CONTEXT.md`
- `docs/adr/README.md`

Steps:

1. Point CLI default deck resolution at `.e2e-test-slides/`.
2. Remove Vite runtime branching between `sample-slides/` and
   `.e2e-test-slides/`.
3. Make regression deck generation write only `.e2e-test-slides/`.
4. Remove any script arguments or sync behavior that exist only to maintain
   `sample-slides/`.
5. Update local development docs and repository context to describe the
   single-path workflow.
6. Mark ADR-0007 and ADR-0012 as superseded and add this ADR to the ADR index.
7. Remove the local `sample-slides/` directory from the working tree when it is
   only a generated duplicate.

## Verification

- [ ] `pnpm prepare:regression-deck` writes `.e2e-test-slides/` only.
- [ ] `pnpm dev` serves `.e2e-test-slides/`.
- [ ] `pnpm --silent starry-slides verify` resolves to `.e2e-test-slides/` by
      default.
- [ ] `pnpm test` passes.
- [ ] `pnpm lint` passes.
