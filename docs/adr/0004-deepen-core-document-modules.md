# ADR-0004: Deepen core by splitting document, history, geometry, and import modules

- Status: superseded
- Date: 2026-05-04
- Superseded by: [ADR-0005](./0005-adopt-two-subject-skill-and-editor-architecture.md)

## Supersession note

ADR-0005 supersedes the parts of this decision that require core to remain a
separate public package. The module-deepening intent still applies, but the
target location changes from `packages/core/src/` to
`packages/editor/src/lib/core/`.

Historical details below remain useful context, but future implementation
should follow ADR-0005 where package boundaries conflict.

## Context

`packages/core` is the source of truth for the reusable document model and
mutation pipeline. That scope is intentional and already established by
ADR-0001 and ADR-0002.

The implementation, however, has drifted into a single concentrated module:

- `packages/core/src/index.ts` currently mixes slide contract types, DOM
  normalization, HTML write-back, operation inversion, history reduction,
  geometry helpers, and manifest-driven import.
- editor modules still need to know core DOM details such as
  `data-editor-id`, `data-editable`, and selector strings.
- the current file layout makes merges harder because unrelated changes land in
  the same file.

The architectural problem is not that `core` owns too much scope. The problem is
that its internal Modules are too shallow and too concentrated.

## Decision

Keep `@html-slides-editor/core` as the same public package, but split its
implementation into focused modules behind the existing barrel export.

The target modules are:

1. slide contract and DOM helpers
2. HTML write-back and operation logic
3. shared history state and reducer logic
4. geometry helpers and layout snapshots
5. generated-deck import helpers

The public export surface should remain stable for current callers. The
implementation can move, but the package should continue to present one
compatible seam.

### Scope

This decision applies to:

- `packages/core/src/`
- small editor call sites that currently duplicate core selector or document
  lookup behavior

This decision does not change:

- ADR-0001's editing pipeline
- ADR-0002's package boundaries
- the fact that `packages/core` owns parsing, write-back, history, geometry,
  and manifest import

## Consequences

Benefits:

- `core` becomes easier to navigate and merge because related logic lives in
  separate Modules
- slide contract changes concentrate in one place
- write-back, history, geometry, and import tests can be read and extended by
  domain instead of through one large file
- editor callers can use deeper helper Modules instead of repeating selector and
  DOM lookup details

Costs:

- more files inside `packages/core/src/`
- a temporary round of import churn while the barrel is rewired
- some editor call sites need small helper replacements to stop duplicating DOM
  contract knowledge

## Alternatives considered

### Keep `packages/core` as one barrel file

Rejected. It keeps the same public surface but preserves the concentration
problem and the merge pressure.

### Move more document semantics into `packages/editor`

Rejected. That would weaken ADR-0002 and make the reusable document model less
deep.

## Implementation Plan

- **Affected paths**: `packages/core/src/index.ts`, new module files under
  `packages/core/src/`, `packages/editor/src/index.tsx`,
  `packages/editor/src/hooks/use-iframe-text-editing.ts`,
  `packages/editor/src/hooks/use-slide-inspector.ts`,
  `packages/editor/src/hooks/use-block-manipulation.ts`,
  `packages/core/src/index.test.ts`
- **Pattern**: keep `packages/core` as one public barrel, but move the
  implementation into focused internal Modules behind that barrel
- **Pattern**: use core-owned helpers for slide element lookup and inline style
  reads where editor currently repeats selector strings
- **Tests**: keep the existing core test coverage passing after the split, and
  add or adjust focused tests if a moved helper changes ownership
- **Verification**:
  - `packages/core` still builds and tests through the same package entry point
  - editor callers no longer need to spell out the core selector string in the
    obvious places
  - the repo continues to behave the same at runtime after the refactor

## ADR Review

✅ **Passes**: self-contained context, clear decision, implementation paths, and
verification criteria.

⚠️ **Gaps found**:
- none that block implementation

**Recommendation**: Ship it.
