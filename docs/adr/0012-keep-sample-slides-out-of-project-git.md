# ADR-0012: Keep sample slides out of project Git

- Status: superseded
- Date: 2026-05-06
- Supersedes: sample deck Git tracking guidance in [ADR-0007](./0007-limit-generated-deck-copies.md)
- Superseded by: [ADR-0026](./0026-adopt-single-generated-regression-deck-path.md)

## Context

The editor writes slide edits back to the active deck HTML files. In normal
development, `pnpm dev` serves `sample-slides/`, so editing a slide mutates files
under that directory.

ADR-0007 kept `sample-slides/` as the default development deck and described it
as the App's long-lived default deck. That left room for the current project Git
repository to track the sample deck files. In practice, tracked sample slide HTML
creates noisy diffs whenever a developer edits slides in the browser editor.

That noise is not useful product versioning. Future editor history or deck
versioning should not depend on the Starry Slides project repository tracking
local sample deck mutations. If versioning is needed, it should be designed as a
separate product capability instead of being implied by this repo's Git index.

## Decision

`sample-slides/` remains the local default deck path for development and CLI
examples, but it must be treated as generated/local working data by this project
repository.

The Starry Slides project Git repository must not track files under
`sample-slides/`.

The directory should stay ignored by `.gitignore`. Agents and developers should
generate or refresh the local sample deck through the existing deck generation
workflow instead of committing slide HTML from browser editing sessions.

`sample-slides/` may still be a real deck package on disk. The restriction is
specifically about tracking those files in this project repository's Git index.
It does not prohibit a user deck, fixture deck, or future storage backend from
using its own persistence or versioning model.

## Consequences

Benefits:

- browser editor edits no longer pollute project diffs with sample slide HTML
- sample deck refreshes become explicit generated-data operations
- future deck history remains decoupled from this repo's Git tracking behavior
- the `.gitignore` rule for `sample-slides/` matches the architecture decision

Costs:

- a fresh checkout may not include `sample-slides/` until a generation command
  creates it
- developer onboarding and verification docs must point to the generation step
  when they need the default sample deck
- tests or scripts that assume tracked sample files must be updated to generate
  or mount an explicit deck path

## Alternatives considered

### Continue tracking `sample-slides/`

Rejected. It makes browser editing look like source changes in `git diff`, and
that conflates local deck editing with project source control.

### Use project Git as the deck versioning layer

Rejected for now. Git can store file snapshots, but editor history, checkpoints,
and user-facing versioning should be explicit product capabilities. The project
repository's Git index should not be the implicit persistence model for sample
deck edits.

### Remove `sample-slides/` as a default path

Rejected for now. The default path is still useful for local development and CLI
examples. The problem is project Git tracking, not the existence of a default
deck directory.

## Non-goals

This decision does not:

- define the future editor history or deck versioning backend
- change the HTML Contract for deck packages
- remove support for `starry-slides open <deck>`
- require generated user decks to live under `sample-slides/`
- make `.e2e-test-slides/` the normal development deck

## Implementation Plan

Affected paths:

- `.gitignore`
- `sample-slides/`
- `README.md`
- `src/node/CONTEXT.md`
- `docs/adr/0007-limit-generated-deck-copies.md`

Steps:

1. Keep `sample-slides/` ignored in `.gitignore`.
2. Remove existing `sample-slides/` files from the current project Git index
   with a non-destructive cached removal, preserving local files on disk.
3. Update docs that describe `sample-slides/` so they call it an ignored local
   default deck, not a tracked built-in source fixture.
4. Ensure commands that need the sample deck either generate it explicitly or
   document the generation prerequisite.
5. Do not introduce a new persistent deck mirror to replace tracked
   `sample-slides/`.

## Verification

- [ ] `git ls-files sample-slides` prints no tracked files.
- [ ] `git check-ignore -v sample-slides/` shows the `.gitignore` rule.
- [ ] Editing a slide through `pnpm dev` changes local files under
      `sample-slides/` without adding tracked project diffs.
- [ ] `pnpm prepare:regression-deck` can create or refresh the ignored local
      regression deck.
- [ ] README and runtime context describe `sample-slides/` as ignored local
      working data.
