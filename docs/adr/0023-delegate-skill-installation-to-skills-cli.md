# ADR-0023: Delegate skill installation to the skills CLI

- Status: proposed
- Date: 2026-05-09

## Context

ADR-0011 reserves `starry-slides add-skill` as part of the agent-facing CLI, but
the command is currently a stub. ADR-0014 explicitly protects that stub until a
later decision defines installation semantics.

Installing an Agent Skill is broader than copying this repository's skill files.
The installer needs to handle agent-specific locations, global versus project
scope, interactive target-agent selection, overwrite behavior, copy/link
semantics, and future Agent Skills conventions. Owning that logic inside Starry
Slides would duplicate the responsibilities of the standard `skills` CLI and
would make Starry Slides responsible for tracking each supported agent's install
rules.

Starry Slides still needs a branded first-run command that is easy to document:

```bash
npx starry-slides add-skill
```

The standard compatible command should also remain available:

```bash
npx skills add StarryKit/starry-slides --skill starry-slides
```

## Decision

Adopt `skills` CLI delegation for Starry Slides skill installation.

`starry-slides add-skill` is a branded wrapper command. It must invoke the
standard Agent Skills installer with the Starry Slides repository and skill id:

```bash
skills add StarryKit/starry-slides --skill starry-slides
```

The wrapper must pass through any additional arguments after `add-skill` to the
underlying `skills add` command. Supported pass-through examples include:

```bash
npx starry-slides add-skill --global
npx starry-slides add-skill --agent codex
npx starry-slides add-skill --agent claude-code --agent codex
npx starry-slides add-skill --all
npx starry-slides add-skill --copy
npx starry-slides add-skill -y
```

The Starry Slides CLI owns only:

- the branded `starry-slides add-skill` entry point
- the canonical repository and skill id passed to `skills add`
- argument pass-through
- process exit-code forwarding
- documentation for the recommended and standard installation commands

The `skills` CLI owns:

- discovering supported agents
- prompting for target agent and install scope
- global versus project installation behavior
- copy/link/install semantics
- overwrite and confirmation behavior
- future Agent Skills installation conventions

The npm package must include a dependency on `skills` and should prefer invoking
the local dependency's `skills` binary rather than shelling out to a nested
`npx` call. A first implementation may use `npx skills ...` if that is the
smallest reliable path, but the target implementation should avoid nested `npx`
because it adds network/package-manager behavior inside an already-running npm
command.

The canonical installable skill id is `starry-slides`. The repository skill
layout should therefore use:

```text
skills/
  starry-slides/
    SKILL.md
    scripts/
    references/
    assets/
```

The current `skills/starry-slides-skill/` directory should be migrated to
`skills/starry-slides/` or kept as a temporary compatibility alias only until
the installer, documentation, and tests no longer reference the old id.

## Consequences

Benefits:

- users get a short branded install command while advanced users can use the
  standard `skills add` command directly
- Starry Slides avoids maintaining agent-specific installation logic
- future improvements to Agent Skills installation flow are inherited from the
  `skills` CLI
- the package keeps one clear CLI surface for both deck workflows and skill
  installation

Costs:

- Starry Slides now depends on the `skills` package for installation behavior
- `starry-slides add-skill` availability depends on `skills` CLI compatibility
- first-release confidence comes from manual smoke testing rather than
  automated child-process delegation tests
- existing references to `skills/starry-slides-skill/` need a migration plan

Deferred:

- whether the first implementation resolves the local `skills` binary directly
  or temporarily shells out through `npx`
- the exact compatibility window for `skills/starry-slides-skill/`
- npm publication readiness checks for the `starry-slides` package name

## Alternatives considered

### Implement a Starry Slides native installer

Rejected. A native installer would need to duplicate the `skills` CLI's agent
detection, installation paths, scopes, confirmation prompts, and compatibility
rules. That creates a maintenance surface unrelated to the Starry Slides deck
workflow.

### Document only `npx skills add ...`

Rejected. The standard command is important for compatibility, but it is not the
best primary user experience. `npx starry-slides add-skill` is easier to
remember and keeps installation documentation under the Starry Slides brand.

### Keep `starry-slides add-skill` as a stub

Rejected. The command is already reserved in ADR-0011, and deferring it leaves
users without a direct installation path from the Starry Slides package.

### Publish a separate skill-only npm package

Rejected for now. The repository already treats the Starry Slides CLI and skill
as one product surface. A separate npm package would add release coordination
without removing the need for a standards-compatible skill installer.

## Non-goals

This decision does not:

- define a custom Agent Skills installation protocol
- fork or replace the `skills` CLI
- install editor runtime dependencies for generated decks
- define cloud-hosted skill distribution
- change the deck verification, preview, export, or editor-open workflows

## Implementation Plan

- **Skill layout**: migrate `skills/starry-slides-skill/` to
  `skills/starry-slides/`, or add a documented temporary compatibility path if a
  rename would break active references during the same change.
- **Package metadata**: add `skills` as a package dependency and ensure the
  published package includes the CLI entry and installable skill files.
- **CLI implementation**: replace the current `add-skill` stub in
  `src/cli/index.ts` with a child-process delegation path that invokes
  `skills add StarryKit/starry-slides --skill starry-slides ...args`.
- **Argument parsing**: preserve all arguments after `add-skill` exactly for
  pass-through. The Starry Slides parser must not reject `skills add` options it
  does not understand.
- **Process behavior**: inherit stdio from the child process and exit with the
  child status. If the child exits without a status, exit non-zero.
- **Automated tests**: do not require new automated coverage for the first
  implementation. Remove or update tests that assert the old stub behavior if
  they block the change.
- **Manual verification**: smoke-test the source and built CLI against the real
  `skills` command or a local fake `skills` executable. Verify that arguments
  are forwarded, stdio remains interactive, and failure exit codes propagate.
- **Documentation**: update `README.md` to recommend
  `npx starry-slides add-skill` and document the standard
  `npx skills add StarryKit/starry-slides --skill starry-slides` fallback.
- **ADR alignment**: ADR-0014's `add-skill` stub expectation is superseded for
  this command. The first implementation may rely on manual verification rather
  than adding command-level automated tests.

## Verification

- [ ] `starry-slides add-skill` delegates to
      `skills add StarryKit/starry-slides --skill starry-slides`.
- [ ] Extra arguments after `add-skill` are forwarded unchanged.
- [ ] The wrapper inherits child stdio so `skills add` can keep its normal
      interactive flow.
- [ ] The wrapper exits with the same status code as the delegated command.
- [ ] Manual source-CLI smoke test succeeds, for example
      `pnpm exec tsx src/cli/index.ts add-skill --agent codex -y`.
- [ ] Manual built-CLI smoke test succeeds after `pnpm build`, for example
      `node dist/cli/index.js add-skill --agent codex -y`.
- [ ] Manual failure-path smoke test confirms a failing delegated command makes
      `starry-slides add-skill` exit non-zero.
- [ ] `README.md` documents both recommended and standard install commands.
- [ ] The repository contains an installable `skills/starry-slides/SKILL.md`.
