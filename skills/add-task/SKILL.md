---
name: add-task
description: Draft and publish roadmap-backed GitHub implementation issues for this repo. Use when the user wants to add a task, turn a roadmap item into a GitHub issue, fill the implementation issue template, or link a new issue back into ROADMAP.md.
---

# Add Task

Use this skill only for this repo's issue-creation workflow.

## Read first

Before doing anything, read:

- [ROADMAP.md](../../ROADMAP.md)
- [references/workflow.md](./references/workflow.md)
- [references/questions.md](./references/questions.md)
- [/.github/ISSUE_TEMPLATE/implementation-task.md](../../.github/ISSUE_TEMPLATE/implementation-task.md)
- [docs/agents/issue-tracker.md](../../docs/agents/issue-tracker.md)

If the task touches architecture or package boundaries, also read the relevant
ADRs and package `CONTEXT.md` files.

## Workflow

1. Read `ROADMAP.md` and identify the relevant milestone.
2. Ask the user which milestone and which implementation slice this new task
   belongs to if it is not already clear.
3. Ask only the missing questions needed to fill the issue template.
4. Draft the full issue title and body.
5. Show the draft to the user and wait for explicit approval before creating
   the issue.
6. After approval, create the GitHub issue using the repo's configured issue
   tracker workflow.
7. Update `ROADMAP.md` by adding the issue link under the relevant milestone's
   `Related issues` section.
8. Report the created issue number, URL, and the roadmap change.

## Rules

- Treat GitHub Issues as the canonical todo system for this repo.
- Do not start implementation from this skill; this skill only creates and
  links tasks.
- Do not create the issue until the user approves the final draft.
- Keep the issue scoped to one concrete implementation slice.
- Keep acceptance criteria observable and testable.
- Include `pnpm verify` in the testing section unless the user explicitly wants
  a narrower contract.
- If there is no matching milestone yet, stop and ask the user to update
  `ROADMAP.md` first or explicitly authorize you to draft the milestone change.

## Roadmap update format

Under the relevant milestone's `Related issues` section, add one bullet in this
format:

- `[#123](https://github.com/Mine77/html-slides-editor/issues/123) Short issue title`
