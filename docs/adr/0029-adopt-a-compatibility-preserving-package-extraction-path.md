# ADR-0029: Adopt a compatibility-preserving package extraction path

- Status: proposed
- Date: 2026-05-16
- Supersedes: [ADR-0008](./0008-adopt-starrykit-slides-single-package.md)

## Context

Starry Slides currently ships as a single `starry-slides` package with the CLI,
editor runtime, local preview/rendering pipeline, and Skill entrypoint all tied
together. That shape is still the correct compatibility surface for existing
Skill users, who must keep the same install and command flow.

The next product phase needs the open-source repo to expose reusable, versioned
components for the editor and slide-domain logic so a closed-source product repo
can embed them without inheriting the local CLI/server runtime. At the same
time, the open-source repo must keep local rendering available for its own
users.

The render boundary also needs to stay portable: local rendering in OSS, server
rendering in the product backend, but the same render plan and contract rules in
both places.

## Decision

Adopt a compatibility-preserving workspace split:

1. Keep `starry-slides` as the public compatibility package and user-facing
   runtime.
2. Introduce `@starrykit/slides-core` for slide contract, document model,
   validation, history, operation, and export-planning logic.
3. Introduce `@starrykit/slides-editor` for the embeddable React editor.
4. Keep local server, browser launch, and local rendering execution inside the
   `starry-slides` package internals.
5. Make render planning live in `slides-core`, while render execution remains an
   adapter that can be local in OSS or remote in the product backend.
6. Release the compatibility package and the reusable packages in lockstep
   SemVer versions.

## Consequences

Benefits:

- current Skill users keep the same package name and command names
- the product repo can consume stable reusable packages
- local rendering remains available in the open-source repo
- server-side rendering can later reuse the same planning logic
- the editor becomes easier to embed because it consumes explicit props and
  callbacks instead of product-specific globals

Costs:

- the repository becomes a workspace and needs stricter packaging discipline
- the team must maintain explicit public APIs instead of deep-importing
  internals
- migration introduces compatibility wrappers and release coordination work

Deferred:

- whether the product backend later introduces a dedicated remote renderer
  package
- whether the root package later exports a minimal JS API in addition to the
  CLI
- whether the reusable packages later split into independently versioned
  release tracks

## Alternatives considered

### Keep the single package forever

Rejected. It preserves short-term simplicity but prevents the product repo from
depending on reusable packages without also depending on the local runtime.

### Extract the runtime into its own public package

Rejected for now. The product repo does not need the local browser/server
runtime as a separately published dependency.

### Extract only the editor package

Rejected. The product repo also needs the slide-domain logic and export-planning
rules, not just the React UI.

## Implementation Plan

- **Affected paths**:
  - `package.json`
  - `pnpm-workspace.yaml`
  - `packages/slides-core/package.json`
  - `packages/slides-core/src/index.ts`
  - `packages/slides-editor/package.json`
  - `packages/slides-editor/src/index.tsx`
  - `src/node/`
  - `src/cli/`
  - `src/index.tsx`
  - `docs/adr/README.md`
  - `README.md`
  - `README.zh-CN.md`
  - `skills/starry-slides/SKILL.md`
  - `docs/skills-references/`

- **Pattern**:
  - keep `starry-slides` as the compatibility package that current Skill users
    install
  - expose only stable public APIs from `slides-core` and `slides-editor`
  - keep Chromium/Playwright rendering and file-system runtime behavior in the
    root package internals
  - keep `slides-core` browser-safe and free of React and runtime dependencies
  - keep `slides-editor` host-driven: inputs in, callbacks out
  - use lockstep SemVer releases so the compatibility package and reusable
    packages stay aligned

- **Migration steps**:
  - add workspace package manifests without changing the current CLI surface
  - create compatibility re-export entry points for the new packages
  - move or re-export the reusable core/editor APIs behind those package
    boundaries
  - add packaging checks that prove `starry-slides` still behaves the same for
    Skill users
  - update the product-facing docs to consume the new packages instead of
    internal runtime modules

- **Tests**:
  - verify the root package still installs and runs the current CLI commands
  - verify the Skill shell still references the same user-facing command names
    and installation path
  - verify the reusable packages can be imported without pulling in the local
    runtime
  - verify local preview and export flows still work in the open-source repo
  - verify package builds and publish artifacts remain deterministic

## Verification

- [ ] `starry-slides verify`, `starry-slides view`, and `starry-slides open`
      continue to work for existing Skill users without a command rename
- [ ] the root `starry-slides` package still packages the CLI and Skill files
      needed by current users
- [ ] `@starrykit/slides-core` can be imported without React or local runtime
      dependencies
- [ ] `@starrykit/slides-editor` can be embedded by a product host through
      props and callbacks rather than product-specific global state
- [ ] local rendering for preview and export still works in the open-source
      repository
- [ ] workspace builds and tests pass in a lockstep release workflow
