# ADR-0005: Adopt two-subject architecture for Starry Slides Skill and Editor

- Status: accepted
- Date: 2026-05-05

## Context

Starry Slides needs a first-release architecture that is easy for existing agent
users to understand and install.

The intended user path is:

1. A user asks their existing agent to create slides.
2. The agent uses `starry-slides-skill` together with user context and any
   useful upstream slide, deck, document, brand, or design skills.
3. The skill produces generated slides that satisfy the Starry Slides Contract.
4. The skill validates and normalizes the generated deck.
5. The skill opens Starry Slides Editor so the user can manually edit the deck.

The current repository has related but separate pieces:

- `skills/slides-protocol`
- `skills/html-slides-generator`
- `skills/slides-style-pack-starter`
- `packages/core`
- `packages/editor`

The current package-boundary ADRs intentionally made `packages/core` a reusable
package. That helped deepen the document model, but the product framing is now
clearer if there are only two external subjects:

- `starry-slides-skill` for agent-side generation and delivery
- Starry Slides Editor, published as `@starry-slides/editor`, for loading,
  editing, and saving generated slides

This ADR supersedes the package-boundary portions of ADR-0002 and ADR-0004 that
require `packages/core` to remain a separate public package.

## Decision

Adopt a two-subject architecture:

```text
starry-slides-skill
  + user agent
  + user context
  -> generated slides

Starry Slides Editor
  + generated slides
  -> visual editing and saving
```

### Subject 1: `starry-slides-skill`

`starry-slides-skill` is the agent-installable entry point. It is responsible
for:

- collecting user prompt, files, design references, and upstream skill outputs
- creating or converting a slide draft
- enforcing the Starry Slides Contract
- validating and normalizing generated slides
- preparing generated slides for the editor
- opening Starry Slides Editor
- collecting structured feedback when the agent cannot resolve a problem

The skill contains references and tools:

```text
starry-slides-skill/
  SKILL.md
  references/
    feedback.md
    contract-protocol/
      contract-v1.md
      archetypes.md
      specimen-deck.json
  tools/
    contract-protocol/
      validate-slides.mjs
      annotate-slides.mjs
      build-manifest.mjs
    install-current-deck.mjs
    open-editor.mjs
    send-feedback.mjs
```

`references/contract-protocol` defines the generated slide contract.
`tools/contract-protocol` executes validation, annotation, and manifest
generation.

Feedback uses reference plus script:

- `references/feedback.md` tells the agent when to send feedback, which fields
  to include, which data must not be uploaded, and how to explain failure to
  the user.
- `tools/send-feedback.mjs` creates a standard JSON feedback event, writes a
  local feedback log, and optionally sends the event to a remote endpoint when
  `STARRY_SLIDES_FEEDBACK_URL` and any required token are configured.

Agents must not hand-roll feedback HTTP calls or invent ad hoc feedback
formats.

### Subject 2: Starry Slides Editor

Starry Slides Editor is the editor package, published as
`@starry-slides/editor`. It is responsible for:

- loading generated slides
- rendering the visual editor UI
- editing Contract-compatible slide HTML
- saving edited slides
- owning editor-local library code for deck import, slide model, document
  operations, and history
- owning E2E tools and fixtures

The editor package should contain the current core package implementation as an
internal library:

```text
@starry-slides/editor
  src/
    lib/
      core/
        deck import
        slide contract model
        document operations
        history
    UI runtime
  tools/
    e2e/
      regression deck generator
      editor fixtures
```

`packages/core` should be merged into `packages/editor/src/lib/core` and should
no longer be presented as a separate external subject.

The current `skills/html-slides-generator` should stop being a skill. Its deck
generation logic should become an editor E2E test tool.

## Skill Contract Specs

`starry-slides-skill` outputs a deck package, not a single HTML string.

Recommended structure:

```text
deck-name/
  manifest.json
  slides/
    01-title.html
    02-agenda.html
    03-content.html
  assets/
    image-hero.png
    chart-source.json
```

`manifest.json` must include:

```json
{
  "deckTitle": "Deck title",
  "topic": "User-facing topic",
  "generatedAt": "2026-05-05T00:00:00.000Z",
  "slides": [
    {
      "file": "slides/01-title.html",
      "title": "Title"
    }
  ]
}
```

Each slide HTML file must:

- be a standalone HTML file
- contain exactly one `data-slide-root="true"` root
- set `data-slide-width="1920"` and `data-slide-height="1080"` on the root
- preferably set `data-editor-id="slide-root"` on the root
- mark editable text with `data-editable="text"`
- mark replaceable images with `data-editable="image"`
- mark selectable or movable containers with `data-editable="block"`
- leave decorative layers unmarked
- preferably set stable `data-editor-id` values on editable nodes

Validation must block at least:

- missing slide root
- multiple slide roots
- invalid `data-editable` values
- manifest entries without slide files
- manifest entries pointing to missing files

Validation may warn for:

- missing `data-archetype`
- missing stable `data-editor-id`
- slides with no editable nodes
- editable images that are not `<img>` elements
- unreachable external resources

## Consequences

Benefits:

- the product has two clear external subjects: skill and editor
- agent users install one skill instead of choosing among protocol/generator
  skills
- other PPT or Slides skills can provide upstream content and design context
  without competing with the final Starry Slides compatibility layer
- Contract specs stay close to the skill that enforces them
- feedback behavior is deterministic because a script owns event formatting,
  local logging, and optional remote reporting
- editor E2E deck generation is owned by the editor package instead of being
  exposed as a user-facing skill
- editor internals become easier to package because core logic lives inside
  `@starry-slides/editor`

Costs:

- `packages/core` loses its current public-package boundary
- imports from `@starry-slides/core` must move to `@starry-slides/editor` or
  editor-internal paths
- ADR-0002 and ADR-0004 are superseded where they require a separate public
  `packages/core` package
- the first implementation requires directory moves and script renames before
  behavior changes become visible

## Alternatives considered

### Keep `slides-protocol` as a separate skill

Rejected. It makes the user-facing installation story less clear. The protocol
is necessary, but it is an internal contract reference and toolset for
`starry-slides-skill`, not a separate user goal.

### Keep `html-slides-generator` as a user-facing skill

Rejected. Its useful role is generating repeatable decks and fixtures for
editor testing. Keeping it as a skill would compete with `starry-slides-skill`
and make the agent priority strategy weaker.

### Keep `@starry-slides/core` as an external package

Rejected for this release direction. A separate public core package is cleaner
for long-term reuse, but the immediate product model is clearer if Editor owns
its internal document library and exposes only the APIs that consumers need
through `@starry-slides/editor`.

## Non-goals

This decision does not:

- implement full PPTX bidirectional conversion
- define a theme marketplace
- add cloud deck hosting
- add multi-user collaboration
- make Starry Slides Editor infer intent from non-contract HTML
- define the final remote feedback service protocol

## Implementation Plan

### Affected paths

- `skills/slides-protocol/`
- `skills/html-slides-generator/`
- new `skills/starry-slides-skill/`
- `packages/core/`
- `packages/editor/`
- `apps/web/`
- `package.json`
- `pnpm-workspace.yaml`
- `docs/adr/README.md`

### Steps

1. Create `skills/starry-slides-skill/`.
2. Move `skills/slides-protocol/references/*` into
   `skills/starry-slides-skill/references/contract-protocol/`.
3. Move `skills/slides-protocol/tools/*` into
   `skills/starry-slides-skill/tools/contract-protocol/`.
4. Add `skills/starry-slides-skill/references/feedback.md`.
5. Add `skills/starry-slides-skill/tools/send-feedback.mjs`.
6. Add or move editor delivery tools:
   `install-current-deck.mjs` and `open-editor.mjs`.
7. Convert `skills/html-slides-generator/generate-slides.mjs` into
   `packages/editor/tools/e2e/generate-regression-deck.mjs`.
8. Remove or deprecate `skills/html-slides-generator/SKILL.md`.
9. Move `packages/core/src/*` into `packages/editor/src/lib/core/*`.
10. Move `packages/core` tests into focused tests under
    `packages/editor/src/lib/core/`.
11. Update imports so `apps/web` depends on `@starry-slides/editor`, not
    `@starry-slides/core`.
12. Update root scripts:
    - `starry:contract:validate`
    - `starry:contract:annotate`
    - `starry:contract:manifest`
    - `editor:e2e:generate-deck`
    - `starry:open`
13. Remove `@starry-slides/core` from workspace dependencies once no package
    imports it directly.

## Verification

- [ ] `starry-slides-skill` exists with `SKILL.md`, contract references,
      feedback reference, contract tools, editor open tool, and feedback tool.
- [ ] The contract validator still validates generated slide HTML and manifest
      files after moving under `starry-slides-skill`.
- [ ] Feedback can be written locally without network access.
- [ ] Remote feedback is attempted only when configured.
- [ ] `skills/html-slides-generator` is no longer exposed as a user-facing
      skill.
- [ ] Editor E2E tests can generate their regression deck from
      `packages/editor/tools/e2e`.
- [ ] `packages/core` code has moved under `packages/editor/src/lib/core`.
- [ ] `apps/web` no longer imports `@starry-slides/core` directly.
- [ ] The workspace builds and tests after package and script updates.
