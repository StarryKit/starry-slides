---
name: GitHub Native Workflow
description: Runs a GitHub-native planning and delivery workflow rooted in a roadmap, ADRs, and issues. Use when the user wants to define or repair a roadmap, create roadmap-backed GitHub issues, start implementation sessions from approved issues, or close the loop after merge by updating issues and the roadmap.
---

# GitHub Native Workflow

Use this skill for repos that want one durable flow:

`roadmap -> ADR -> issue -> implementation session -> PR -> merge -> closeout`

## Read first

Before doing any workflow step, read:

- [references/workflow.md](./references/workflow.md)
- [references/questions.md](./references/questions.md)
- [references/roadmap-contract.md](./references/roadmap-contract.md)
- [references/issue-template.md](./references/issue-template.md)

Then inspect the current repo for:

- a canonical roadmap file such as `ROADMAP.md` or `Roadmap.md`
- issue tracker instructions such as `docs/agents/issue-tracker.md` or `AGENTS.md`
- an ADR system such as `docs/adr/README.md`, `adr/`, `docs/decisions/`, or `decisions/`
- repo context docs such as `CONTEXT-MAP.md`, `CONTEXT.md`, package `CONTEXT.md`, or equivalent architecture notes

If multiple roadmap files exist, ask the user which one is canonical before proceeding.

## Gates Before Issue Creation

1. A roadmap file exists and passes the minimum contract in `references/roadmap-contract.md`.
2. The target milestone already exists in the roadmap and is clear enough to decompose into one concrete implementation slice.
3. The repo has an ADR path, template, or an installed ADR skill that can be used before architecture-touching work starts.
4. The issue draft links the relevant roadmap milestone, ADRs, and repo context docs.
5. The issue scope is narrow enough for one implementation session or a small coordinated set of sessions.

If any gate fails, stop issue creation and normalize the roadmap or ADR setup first.

## Main Flows

1. **Roadmap normalization**
   - If the roadmap is missing, under-specified, or ambiguous, ask targeted questions from `references/questions.md`.
   - Draft the missing roadmap structure or milestone edits.
   - Get user approval before editing the roadmap.

2. **Issue drafting**
   - Collect only the missing information needed for one implementation issue.
   - Show the final title, body, and roadmap update before publishing.
   - Wait for explicit approval before creating the issue.

3. **Implementation session handoff**
   - Once the issue exists, treat it as the execution contract for future Codex sessions.
   - Capture both the issue number and the canonical GitHub issue URL in the workflow output and in any roadmap update tied to the new issue.
   - New implementation sessions should start from the issue, related ADRs, and the relevant repo context docs.

4. **Closeout**
   - After merge, link the PR back to the issue if the repo workflow expects it.
   - Close the issue with the merged outcome.
   - Update the roadmap milestone so the issue is recorded as completed or landed.

## Rules

- Do not start implementation from an untracked request when this workflow is in force.
- Do not create an issue until roadmap and ADR preconditions are satisfied, or the user explicitly accepts the gap.
- Keep one issue focused on one implementation slice.
- Keep acceptance criteria observable and testing expectations explicit.
- After creating an issue, update the roadmap's related-issue entry to include the issue URL, not only the `#123` shorthand, unless the repo already requires a different format.
- If the change affects architecture, package boundaries, persistence, deployment shape, or long-lived workflow rules, require ADR review or ADR creation before implementation.
- If the roadmap or ADR setup is missing, guide the user by asking questions instead of guessing hidden structure.
