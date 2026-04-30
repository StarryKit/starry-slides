# Add Task Workflow

This reference defines the workflow used by the `add-task` skill.

## Core rule

Every development task in this repo must be executed from a GitHub issue.

No implementation work should start from an untracked chat request alone. The
issue is the execution contract for the task.

## Flow

1. discuss architecture, product behavior, and design direction in the main
   planning session
2. capture milestone-level planning in `ROADMAP.md`
3. break roadmap milestones down into concrete GitHub issues
4. create one issue per implementation slice
5. link each issue back into the relevant milestone in `ROADMAP.md`
6. use that issue later as the source of truth for implementation

## Responsibilities

The user owns:

- milestone planning
- roadmap updates
- milestone decomposition into issues

The skill helps by:

- collecting the missing issue details
- drafting the issue body
- creating the GitHub issue after approval
- updating the milestone's `Related issues` list in `ROADMAP.md`

## Issue quality bar

Each issue should define:

- the problem
- scope
- non-goals
- acceptance criteria
- testing expectations
- roadmap / ADR / context links

If that information is incomplete, ask follow-up questions before creating the
issue.
