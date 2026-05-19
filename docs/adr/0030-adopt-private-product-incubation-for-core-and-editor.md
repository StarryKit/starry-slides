# ADR-0030: Adopt private product incubation for core and editor

- Status: accepted
- Date: 2026-05-19
- Builds on: [ADR-0029](./0029-adopt-a-compatibility-preserving-package-extraction-path.md)

## Context

The next Starry Slides phase needs a hosted product with workspace, user
authentication, Supabase-backed persistence, API routes, and server-side Agent
editing.

At the same time, the current `slides-core` and `slides-editor` packages are
still immature. Product work will expose editor bugs and missing core
capabilities frequently. If the hosted product consumes the open-source editor
only as an external dependency from a separate repository, each editor fix will
require switching repositories, changing context, publishing or linking a new
package version, and then returning to product work.

That workflow is too slow for the incubation phase.

The product also must not turn the reusable packages into closed product code.
The open-source repository should continue to receive editor and core
improvements on a periodic manual cadence, even if every product commit is not
mirrored immediately.

ADR-0029 already extracts `@starrykit/slides-core` and
`@starrykit/slides-editor` as reusable packages. This ADR defines how those
packages should evolve while the hosted product is being built.

## Decision

Create a new private product repository by copying the current Starry Slides
repository.

During the product incubation phase, the private product repository is the
primary development workspace for:

- hosted workspace and account features
- Supabase-backed persistence and APIs
- server-side Agent orchestration
- product-specific routing and application shell
- ongoing `slides-core` and `slides-editor` bug fixes and feature work

The open-source repository remains the public compatibility and release
repository. It receives manual periodic updates from the private product
repository for the reusable public surfaces:

- `packages/slides-core/`
- `packages/slides-editor/`
- public tests that verify those packages
- public documentation and ADR updates that describe those packages

The product repository must keep a strict boundary between reusable packages and
private product code:

1. `packages/slides-core` remains browser-safe, React-free, Supabase-free,
   runtime-free, and product-auth-free.
2. `packages/slides-editor` remains host-driven. It may render product-usable
   UI extension points, but it must receive data and side effects through props,
   callbacks, commands, or adapters supplied by the host app.
3. The editor package must not directly import Supabase clients, product API
   routes, server Agent runtimes, private environment variables, or workspace
   database helpers.
4. Product persistence lives in product-owned API and adapter code. User edits
   still flow through the shared operation and HTML write-back pipeline before
   being saved.
5. Agent execution lives in product-owned server code. The editor may expose an
   Agent interaction surface, but it must call host-provided callbacks rather
   than running or importing the Agent backend directly.
6. Open-source synchronization is intentional and manual. Product-only commits
   do not need to be mirrored, but reusable core/editor changes should be
   periodically merged or cherry-picked back to the open-source repository.

This is an incubation workflow, not a permanent statement that the private
repository owns the public packages forever. Once the editor and core APIs are
stable enough, the team may revisit whether the open-source repository becomes
the primary source of package releases and the product repository consumes those
packages normally.

## Consequences

Benefits:

- product work can fix editor and core bugs in the same repository and context
- early product iteration is faster because no publish/link cycle is needed for
  every editor change
- the hosted app can be built around the real editor instead of a stale package
  snapshot
- open-source users still receive reusable package improvements on a deliberate
  cadence
- ADR-0029's reusable package boundaries remain meaningful during private
  product development

Costs:

- reusable-package changes must be reviewed for private-product coupling before
  they are synced back
- the team must maintain a disciplined sync process between repositories
- merge conflicts can accumulate if open-source and product repositories both
  change the same package files independently
- package release ownership should be revisited after the incubation phase

Deferred:

- the exact private repository name and hosting settings
- the exact weekly or cycle-based synchronization command sequence
- whether synchronization uses direct merges, cherry-picks, subtree-style
  workflows, patches, or another release branch process
- whether the product later consumes published `@starrykit/*` packages instead
  of keeping local workspace copies

## Alternatives considered

### Build the product in a fresh repository that only consumes published packages

Rejected for the incubation phase.

This keeps repository boundaries clean, but it makes editor bug fixing too
expensive while `slides-editor` and `slides-core` are still changing quickly.
Every product-discovered editor issue would require a cross-repository fix,
package update, and reintegration loop.

### Keep all product work in the open-source repository

Rejected.

The hosted product will include private application code, Supabase project
configuration, account/workspace behavior, and Agent orchestration that should
not all become part of the open-source compatibility package.

### Copy the repository and allow product code to freely modify editor internals

Rejected.

This is fast at first, but it makes later open-source synchronization fragile.
If reusable packages import Supabase, product APIs, or private Agent code,
manual public sync becomes a cleanup project instead of a routine update.

### Use the open-source repository as the only source of truth immediately

Deferred.

This may become the right model once the reusable package APIs stabilize. It is
premature while product work is still expected to reveal frequent editor and
core defects.

## Non-goals

This ADR does not:

- define the Supabase schema for workspaces, decks, slides, operations, or
  versions
- define product authentication flows
- define the Agent protocol or tool execution model
- remove the open-source CLI/runtime compatibility package
- require every private product commit to be mirrored to the open-source
  repository
- choose a permanent long-term repository topology after product incubation

## Implementation Plan

- **Private product repository setup**:
  - create a new private repository from the current Starry Slides repository
  - keep `packages/slides-core` and `packages/slides-editor` in the product
    workspace
  - add product-owned app/backend code outside those reusable package
    boundaries
  - remove or stop using CLI-specific surfaces in the product app only when they
    are not needed by the hosted product

- **Package boundary pattern**:
  - keep `slides-core` limited to contract, parsing, operation, history,
    write-back, validation, and planning logic
  - keep `slides-editor` limited to React editor UI and host integration
    callbacks
  - place Supabase clients, API route handlers, auth session code, workspace
    routing, and Agent server orchestration in product-owned app or package
    paths
  - implement product persistence through host adapters that call product APIs
    after shared edit operations update the deck HTML/source state
  - implement Agent editing through product-owned server APIs and
    editor-provided interaction hooks

- **Open-source sync pattern**:
  - periodically review product changes under `packages/slides-core` and
    `packages/slides-editor`
  - exclude product-only imports, environment assumptions, and private API
    dependencies before syncing
  - sync public package changes, relevant tests, public docs, and ADR updates
    back into the open-source repository
  - run the open-source verification workflow after each sync
  - publish or release the open-source packages only after the synchronized
    state passes the normal public checks

- **Guardrails for future agents**:
  - before adding Supabase, auth, workspace, or Agent imports under
    `packages/slides-core` or `packages/slides-editor`, stop and either move the
    code to a product-owned adapter or write a new ADR that supersedes this one
  - when changing editor save behavior, preserve the shared operation and HTML
    write-back pipeline from ADR-0001
  - when changing package boundaries, check ADR-0029 and this ADR together

## Verification

- [ ] the private product repository exists and is private
- [ ] product-owned workspace/auth/API/Supabase/Agent code lives outside
      `packages/slides-core` and `packages/slides-editor`
- [ ] `packages/slides-core` has no React, Supabase, product API, Agent runtime,
      Node runtime, or private environment-variable dependency
- [ ] `packages/slides-editor` can be embedded through host-provided props,
      callbacks, commands, or adapters
- [ ] editor save behavior in the product still applies shared operations and
      HTML write-back before calling product persistence APIs
- [ ] at least one product-to-open-source sync proves that core/editor changes
      can be merged back without private product code
- [ ] the open-source verification workflow passes after a synchronized
      core/editor update
