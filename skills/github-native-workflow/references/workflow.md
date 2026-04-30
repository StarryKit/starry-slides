# GitHub Native Workflow Reference

This reference defines the operating model for the `GitHub Native Workflow`
skill.

## Core rule

GitHub Issues are the execution contracts for development work.

Roadmap milestones define the planned outcomes.
ADRs define durable technical decisions.
Issues define concrete implementation slices.
PRs and merges record delivery.
The roadmap is updated again at closeout so planning stays truthful.

## Workflow

1. discuss product direction, architecture direction, and milestone intent
2. capture that plan in the roadmap
3. confirm that relevant ADRs already exist or create them first
4. break one milestone into one concrete GitHub issue
5. approve and publish the issue
6. start one or more implementation sessions from that issue
7. open and merge the PR
8. close the issue and update the roadmap

## Phase 0: Inspect the repo

Before running the workflow, inspect:

- roadmap file
- issue tracker conventions
- ADR directory or ADR skill availability
- context documents or architecture notes

Do not assume filenames or formats beyond what the repo actually contains.

## Phase 1: Normalize the roadmap

If the roadmap is missing or weak:

- ask only the questions needed to make it usable
- draft the missing structure
- confirm the canonical roadmap filename
- get user approval before editing it

The roadmap is ready only when at least one milestone passes the
enough-information test in `roadmap-contract.md`.

## Phase 2: Draft the issue

Every issue created from this workflow should contain:

- summary
- problem
- scope
- non-goals
- acceptance criteria
- tests
- roadmap link
- ADR links
- context links

If the repo already has an issue template, use it.
If not, follow that section order.

## Phase 3: Handoff to implementation sessions

After the user approves and the issue is created:

- treat the issue as the source of truth for implementation
- capture the created issue's canonical URL and preserve it in the roadmap update or handoff notes for future sessions
- start new Codex sessions from the issue number or issue URL
- read the linked ADRs before proposing architecture changes
- keep implementation scoped to the issue instead of silently expanding the task

If one issue needs multiple sessions, each session should still start from the
same issue contract.

## Phase 4: PR and merge

When implementation is complete:

- ensure the PR references the issue if the repo expects linked issues
- ensure the issue body or comments reflect any meaningful scope adjustments
- ensure ADR updates land in the same change if the decision changed during implementation

## Phase 5: Closeout

After merge:

- close the issue
- leave a short final comment if the repo convention expects one
- update the roadmap's `Related issues` section to show the issue as landed or completed
- keep roadmap status honest; do not mark a milestone complete if only one slice landed

## Responsibilities

The user owns:

- milestone intent
- final roadmap direction
- final issue approval
- merge approval

The skill helps by:

- validating roadmap readiness
- identifying ADR gaps
- drafting roadmap repairs
- drafting issue bodies
- publishing approved issues
- updating roadmap links at creation and closeout, including the canonical issue URL when a new issue is published

## Quality bar

A workflow run is not complete unless:

- the roadmap is usable
- ADR expectations are clear
- the issue is specific
- implementation can start from the published issue without hidden context
- closeout updates keep roadmap and issue state aligned
