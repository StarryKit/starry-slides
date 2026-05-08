# Starry Slides Context

This repo uses a multi-context documentation layout inside a single product
package.

Start here:

- [CONTEXT-MAP.md](/Users/haichao/code/starry-slides/CONTEXT-MAP.md)

Relevant context docs:

- [src/core/CONTEXT.md](/Users/haichao/code/starry-slides/src/core/CONTEXT.md)
- [src/editor/CONTEXT.md](/Users/haichao/code/starry-slides/src/editor/CONTEXT.md)
- [src/node/CONTEXT.md](/Users/haichao/code/starry-slides/src/node/CONTEXT.md)

Shared planning:

- [ROADMAP.md](/Users/haichao/code/starry-slides/ROADMAP.md)

## Architecture Decisions

Cross-context architectural decisions remain in
[docs/adr/README.md](/Users/haichao/code/starry-slides/docs/adr/README.md).

Read the ADR index and relevant ADRs before changing architecture,
persistence, collaboration, package boundaries, history, or editor pipeline
semantics.

Important current decisions:

- ADR-0001: editing pipeline and versioning strategy
- ADR-0003: Tailwind and shadcn/ui for editor UI
- ADR-0007: generated deck copy policy
- ADR-0008: `@starrykit/slides` single-package architecture
- ADR-0009: Floating Toolbar as the only element tooling surface
- ADR-0016: PDF export pipeline through core, runtime, CLI, and editor
- ADR-0021: reusable Present mode and single HTML export

## Testing Contracts

[docs/editing-e2e-coverage-matrix.md](/Users/haichao/code/starry-slides/docs/editing-e2e-coverage-matrix.md)
is the living coverage map for ADR-0013. When adding, removing, or moving
editor-facing E2E coverage, update this matrix so feature groups, invocation
surfaces, fixtures, behavior effects, history expectations, persistence
expectations, and test file references stay accurate.

Do not update the matrix for purely internal helper refactors unless the
covered behavior, test file, or test name changes.
