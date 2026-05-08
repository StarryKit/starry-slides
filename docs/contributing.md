# Contributing Guide

Starry Slides is built around an HTML-first editing model. Contributions should
preserve that model and keep committed editor changes flowing through shared
core operations.

## Before You Change Code

Read the relevant context:

- `CONTEXT-MAP.md`
- `src/core/CONTEXT.md`
- `src/editor/CONTEXT.md`
- `src/node/CONTEXT.md`
- `CONTEXT.md` for architectural decision pointers

Use ADRs for changes that alter architecture, persistence, collaboration,
package boundaries, history semantics, or editor pipeline semantics.

## Change Expectations

- Keep edits scoped to the feature or bug being handled.
- Prefer existing operation, history, and parser patterns over parallel paths.
- Add focused tests when behavior changes.
- Keep generated decks Contract-compatible.
- Update documentation when user-facing commands, workflows, or boundaries
  change.

## Verification

Run the smallest meaningful check while developing. Before release-oriented work
is closed, run:

```bash
pnpm verify
```

For documentation-only changes, a narrower check may be enough. For editor UI
changes, include rendered browser validation when practical.

## Agent-Facing Work

The agent-facing generation workflow lives in
`skills/starry-slides-skill/`. Agents should use the local `starry-slides` CLI
for validation, previewing, and opening decks instead of owning a separate
editor runtime.
