# ADR-0028: Adopt notify-only runtime updates and remote skill references

- Status: proposed
- Date: 2026-05-12

## Context

Starry Slides now has two distinct update surfaces:

1. the npm runtime package
2. the Agent Skill installation

The npm runtime package already contains both the CLI and the local browser
editor. The editor is not a separately versioned or separately deployed product
surface. Users receive editor changes only by upgrading the `starry-slides` npm
package.

The Skill has a different lifecycle. Its stable purpose is to teach the agent
how to use Starry Slides, but some of its content changes more often than the
local Skill shell should require. Examples include workflow guidance, contract
references, CLI usage notes, and similar agent-facing documentation.

We want a clearer update model that:

- keeps runtime upgrades predictable
- avoids hidden environment mutation during normal CLI commands
- allows Skill guidance to evolve without requiring frequent local Skill
  reinstalls
- keeps agent-facing command output parseable and stable
- makes update notifications explicit and actionable for agents

This ADR also needs to stay compatible with the existing single-package runtime
model and the current direction in ADR-0023, which keeps Skill installation
ownership with the `skills` CLI rather than moving it into normal Starry Slides
deck commands.

## Decision

### 1. Runtime package remains the only shipped runtime unit

`starry-slides` remains the single runtime package.

This package includes:

- the CLI
- the local browser editor runtime

The editor is not dynamically updated from a remote host and is not treated as a
separate update surface. CLI and editor upgrades always happen together through
npm package upgrades.

### 2. CLI uses notify-only update checks

The CLI may check whether a newer npm version of `starry-slides` is available
when commands start, but the update strategy is strictly notify-only.

The CLI must not:

- auto-install a newer version
- mutate the global npm installation during a normal deck command
- re-run the original command under a newly installed version

The CLI may notify the caller that a newer runtime version exists and that an
upgrade is recommended or required.

### 3. Update notifications are agent-facing

When the CLI reports that a newer runtime version is available, the message is
intended for the agent, not for a human-only terminal workflow.

The notification should:

- clearly state that a newer `starry-slides` runtime version is available
- tell the agent to upgrade the npm package before continuing when appropriate
- use agent-oriented wording rather than casual human-only wording
- include an explicit upgrade command when that command is known

The notification must not break machine-readable stdout contracts.

Therefore:

- JSON or other structured command results remain on stdout
- update notifications go to stderr or another non-stdout channel

### 4. Agent notification copy follows a fixed policy

Agent-facing notifications should be brief, imperative, and operational.

They should include:

- the current installed version when known
- the latest available version when known
- the exact next action expected from the agent
- the exact upgrade command when known
- a concise rule about whether the current command may proceed or should stop

They should not:

- assume a human will manually interpret the message
- use vague language such as "consider updating sometime"
- print long prose before the actionable instruction
- pollute stdout with human-readable messaging

Preferred notification shape:

```text
Starry Slides runtime update available: current=0.1.3 latest=0.1.4.
Agent action required: upgrade the runtime package before continuing.
Run: npm install -g starry-slides@latest
```

If the current command can continue safely under the installed version, the
message should say so explicitly. If the command should stop until the upgrade
happens, the message should say that explicitly instead.

### 5. CI does not perform runtime or Skill updates

CI is not responsible for updating the Skill and does not auto-upgrade the npm
runtime package during command execution.

CI should use the explicitly installed runtime version for the job and should
not allow normal CLI execution to change that version. This keeps CI runs
deterministic, reproducible, and easy to audit.

CI may disable runtime update notifications entirely if they add noise without
changing CI behavior.

### 6. The Skill becomes a thin local shell with remote references

The local Skill remains installed as a stable shell that defines:

- the Skill identity
- the Skill purpose
- the stable usage entrypoint
- the expectation that Starry Slides CLI is available
- the authoritative remote document locations

The Skill's high-change instructional content moves to remote documents hosted
in the repository, such as GitHub-hosted markdown files.

Examples of remote references include:

- workflow guidance
- deck contract reference
- CLI usage reference
- discovery and interview guidance

The local Skill should point agents to those remote documents instead of
embedding full mutable copies locally.

### 7. CLI does not implicitly update the Skill

The CLI does not install, refresh, overwrite, or upgrade the Skill as part of
normal deck commands or runtime update checks.

Skill installation and Skill-local environment mutation remain separate
concerns. Runtime commands should not silently modify agent-specific Skill
installation state.

### 8. Skill updates usually flow through remote docs, not local reinstall

Most Skill-content updates should be delivered by changing the remote referenced
documents.

Reinstalling or refreshing the local Skill shell should be needed only when the
stable shell itself changes, such as:

- Skill identity or naming changes
- entrypoint changes
- stable invocation contract changes
- required local metadata changes

## Consequences

Benefits:

- runtime upgrades stay predictable and explicit
- normal CLI commands do not secretly mutate the environment
- agent-facing stdout contracts remain clean
- CI behavior stays deterministic
- Skill guidance can evolve quickly through remote docs
- the runtime and editor boundary stays simple because editor updates continue
  to follow npm package upgrades
- agent update prompts become consistent and easier to operationalize

Costs:

- agents must perform an explicit runtime upgrade step after notification
- Skill availability now depends on remote document reachability
- remote documentation becomes part of the product contract and must be kept
  stable enough for agents to rely on
- old local Skill shells may point to remote content that has evolved beyond the
  assumptions of older runtime versions unless compatibility guidance is managed

Deferred:

- the exact runtime version-check cadence and caching policy
- whether update notifications appear on every command or only on selected
  command families
- whether the CLI later adds an explicit `check-update` or `sync` command
- how remote Skill references should be pinned, versioned, or compatibility
  gated against older runtime versions

## Alternatives considered

### Auto-update the npm package and re-run the original command

Rejected. This makes command behavior less predictable, can fail because of
permissions or package-manager configuration, and introduces hidden environment
mutation into normal CLI usage.

### Let CI auto-upgrade during command execution

Rejected. CI should be reproducible and should run against the version selected
by the workflow, not an implicitly changed runtime.

### Keep full Skill references bundled locally

Rejected. This increases Skill reinstall pressure for documentation-only updates
and duplicates high-change content across local installations.

### Let the CLI also refresh the Skill

Rejected. Skill installation scope and agent-specific behavior are separate from
runtime command execution. Normal CLI commands should not silently mutate agent
Skill state.

## Non-goals

This decision does not:

- define the exact remote document hosting implementation details
- define a Skill installer or refresher command
- introduce editor-only remote delivery
- change the current single-package runtime model
- define version-negotiation rules between every historical Skill shell and
  every future runtime version
- define the final UX for human-facing desktop notifications outside the CLI

## Implementation Plan

- **CLI policy**: add a runtime update-check path that can detect newer npm
  versions without mutating the local installation during normal command
  execution.
- **CLI output contract**: keep structured command results on stdout and route
  update messaging to stderr or an equivalent non-stdout channel.
- **Agent copy policy**: document a standard notification format that names the
  current version, latest version, and required agent action.
- **CI policy**: ensure CI runs either suppress runtime update notifications or
  treat them as informational only, without changing the installed runtime.
- **Skill shell**: keep `skills/starry-slides/SKILL.md` as a thin local shell
  that points to remote references instead of embedding full high-change copies.
- **Remote references**: move workflow and contract guidance into repository
  documentation intended for remote consumption, such as GitHub-hosted markdown
  files.
- **Boundary enforcement**: keep Skill installation and refresh behavior out of
  normal runtime deck commands.
- **Documentation**: update README or future user and contributor docs so the
  update model is explicit: runtime updates happen through npm; Skill-content
  updates usually flow through remote docs.

## Verification

- [ ] CLI commands keep stdout parseable for agent-facing structured output.
- [ ] Runtime update checks do not change the installed runtime version.
- [ ] CLI does not auto-retry commands under a newly installed version.
- [ ] Agent-facing notifications specify the required next action and expected
      upgrade command.
- [ ] CI runs do not auto-upgrade runtime or Skill content.
- [ ] The local Skill shell references remote workflow and contract documents.
- [ ] Documentation clearly explains how agents should respond to update
      notifications.
