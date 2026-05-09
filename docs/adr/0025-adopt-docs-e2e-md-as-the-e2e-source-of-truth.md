# ADR-0025: Adopt `docs/e2e.md` as the E2E source of truth

- Status: accepted
- Date: 2026-05-10
- Supersedes: [ADR-0013](./0013-adopt-editing-e2e-coverage-contract.md)

## Context

The repository already has a growing browser-level E2E suite under
`e2e/tests/`, plus multiple ADRs and feature documents that reference E2E
coverage expectations. Until now, the main E2E-oriented ADR was ADR-0013, but
that document mixed desired coverage policy with then-current coverage state.
As the test suite evolved, that made it easy for the ADR and the actual specs
to drift apart.

We now have a code-derived inventory document in `docs/e2e.md` that was
restored directly from the current Playwright specs. That document reflects what
the suite actually asserts today, including assertion strength around history,
reload persistence, and surface-level command coverage.

Without a single authority, E2E coverage information can fragment across:

- `docs/e2e.md`
- ADR-0013
- feature ADR implementation plans that mention E2E expectations
- ad hoc notes in future docs or PRs

That fragmentation creates two recurring problems:

1. people treat a planning/contract ADR as if it were the current test
   inventory
2. new E2E additions or removals update the tests but not the human-facing
   inventory that future work relies on

## Decision

Adopt `docs/e2e.md` as the single source of truth for repository E2E coverage
inventory.

`docs/e2e.md` must answer the question "what E2E coverage do we currently
have?" by reflecting the actual test suite in `e2e/tests/`. It is an inventory
document, not a speculative roadmap and not a normative architecture contract.

From this ADR forward:

- all browser/editor E2E inventory lives in `docs/e2e.md`
- E2E inventory for presenter/export browser flows also lives in `docs/e2e.md`
- new E2E tests must update `docs/e2e.md` in the same change
- deleting or materially narrowing an existing E2E test must update
  `docs/e2e.md` in the same change
- ADRs may reference E2E expectations, but they must point to `docs/e2e.md`
  instead of duplicating a separate coverage matrix or current-state inventory
- if an ADR needs to describe a test requirement for a new feature, that ADR may
  state the requirement briefly, but once the tests exist the current coverage
  record belongs in `docs/e2e.md`

ADR-0013 is superseded because its contract-style matrix guidance is no longer
the authority for current coverage state. Historical ADRs remain useful for
feature intent, architecture, and rollout rationale, but not as the live index
of E2E coverage.

## Consequences

- Future contributors have one stable document to consult before adding or
  changing E2E coverage.
- Feature ADRs stop competing with the coverage inventory document.
- The cost of maintaining E2E documentation shifts to each test change, which is
  intentional and required.
- Reviewers can treat "tests changed but `docs/e2e.md` did not" as a process
  failure when the change affects E2E scope or assertion strength.
- Existing ADR references that previously pointed at
  `docs/editing-e2e-coverage-matrix.md` should point at `docs/e2e.md` instead.

## Non-goals

- This ADR does not redefine how unit, CLI, or core verification tests are
  documented.
- This ADR does not require every feature ADR to restate its E2E coverage in
  full.
- This ADR does not treat `docs/e2e.md` as a product-spec or acceptance-criteria
  substitute. It is specifically the current E2E coverage inventory.

## Implementation Plan

- Rename the restored coverage inventory document to `docs/e2e.md`.
- Update the document header in `docs/e2e.md` so it explicitly states it is the
  E2E source of truth for current coverage inventory.
- Add this ADR and mark ADR-0013 as superseded by ADR-0025.
- Update `docs/adr/README.md` so ADR-0025 appears in the index and ADR-0013 is
  no longer shown as the current E2E authority.
- Update existing ADR references that pointed to
  `docs/editing-e2e-coverage-matrix.md` so they point to `docs/e2e.md`.
- Do not duplicate the matrix in this ADR. The matrix content belongs only in
  `docs/e2e.md`.

## Verification

- [ ] `docs/e2e.md` exists and states that it is the E2E source of truth.
- [ ] ADR-0025 is listed in `docs/adr/README.md` as an accepted ADR.
- [ ] ADR-0013 is marked superseded by ADR-0025.
- [ ] Existing ADR references to the old matrix filename are updated to
      `docs/e2e.md`.
- [ ] No new duplicate E2E inventory document is introduced alongside
      `docs/e2e.md`.

## Alternatives considered

### Keep ADR-0013 as the source of truth

Rejected. ADR-0013 is a planning/contract document and has already drifted from
the current suite. Keeping it as the authority would continue mixing desired and
actual coverage state.

### Keep a matrix document but leave ADR ownership implicit

Rejected. The repo already had multiple places that looked authoritative. We
need an explicit ADR-level decision so future contributors know which document
wins when references disagree.

### Split browser editor E2E and presenter/export E2E into separate inventories

Rejected for now. They live in the same Playwright suite and are maintained by
the same workflow. One inventory document is simpler until scale forces a split.
