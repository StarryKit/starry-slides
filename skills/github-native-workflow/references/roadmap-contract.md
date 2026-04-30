# Roadmap Contract

This skill assumes the repo has one canonical roadmap document.

Preferred filenames:

- `ROADMAP.md`
- `Roadmap.md`

If the repo uses a different file, confirm it with the user and treat that file
as canonical for the session.

## Minimum roadmap structure

The roadmap should answer:

- what the project is trying to accomplish
- what milestones exist
- what each milestone is meant to deliver
- how each milestone will be decomposed into GitHub issues

At minimum, the roadmap should contain:

1. a short project or roadmap intro
2. milestone sections
3. per-milestone goal
4. per-milestone scope
5. per-milestone exit criteria
6. a `Related issues` section or equivalent issue linkage section

## Minimum milestone contract

Each milestone should be specific enough that another agent can break it into
implementation slices without inventing product direction.

Each milestone should define:

- `Status`
- `Goal`
- `Scope`
- `Exit criteria`
- `Related issues`

Recommended but optional:

- `Non-goals`
- `Dependencies`
- `Open questions`

## Enough-information test

A milestone is ready for issue creation only if all of these are true:

- the outcome is clear, not just the activity
- the scope is concrete enough to separate included work from excluded work
- the exit criteria are observable
- the milestone language is specific enough to derive a focused issue
- the milestone can be linked to one or more ADRs when architecture is involved

If any of these fail, ask questions before drafting the issue.

## ADR requirement

This workflow requires an ADR path for architecture-touching work.

Acceptable setups:

- `docs/adr/` with an index such as `README.md`
- `docs/decisions/`
- `adr/`
- `decisions/`
- an installed ADR skill plus user approval to bootstrap ADR docs in the repo

If no ADR setup exists:

1. explain the gap
2. ask whether to bootstrap ADR docs now
3. do not create architecture-touching issues until the ADR path is clear

## Preferred related-issue format

If the repo already has a format, preserve it.

Otherwise use a simple checklist style:

- before completion: `- [ ] [#123 Short title](https://github.com/org/repo/issues/123)`
- after merge: `- [x] [#123 Short title](https://github.com/org/repo/issues/123)`

Rationale:

- the `#123` shorthand is useful for humans inside the repo
- the full URL gives future sessions an unambiguous handoff target

If the repo prefers full URLs, use full GitHub issue links instead.
