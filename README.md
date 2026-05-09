# Starry Slides

## Overview

Starry Slides is a local-first, agent-native slide workflow for HTML slide
decks. Agents generate Contract-compatible deck packages, Starry Slides
validates them, and the browser editor lets people revise the same HTML files
without converting them into a proprietary slide model.

The project rule is simple: HTML stays the source of truth. A deck remains a
set of files on disk rather than data trapped inside a separate editor model,
which makes it easier for people and agents to collaborate in the same
workflow. Validation helps generated decks stay compatible with the expected
slide contract, while the local editor focuses on making direct, reversible
changes to those same source files.

In practice, Starry Slides sits between generation, validation, editing, and
export. It is designed for teams who want slide decks to behave more like code:
inspectable, versionable, scriptable, and safe to evolve incrementally.

## Development

Install dependencies:

```bash
pnpm install
```

Create or refresh the ignored local sample deck:

```bash
pnpm editor:e2e:generate-deck
```

Validate a deck:

```bash
pnpm --silent starry-slides verify sample-slides
```

Open the editor:

```bash
pnpm starry-slides open sample-slides
```

For day-to-day editor development with Vite hot reload:

```bash
pnpm dev
```

Useful CLI commands:

```bash
starry-slides [deck]
starry-slides open [deck]
starry-slides verify [deck]
starry-slides verify [deck] --static
starry-slides view [deck] --slide <manifest-file>
starry-slides view [deck] --all
starry-slides view [deck] --all --out-dir <directory>
starry-slides add-skill [skills-options...]
```

`starry-slides [deck]` defaults to `starry-slides open [deck]`.

Install the Agent Skill with the branded wrapper:

```bash
npx starry-slides add-skill
```

The wrapper delegates to the standard Agent Skills installer and passes through
additional options, for example:

```bash
npx starry-slides add-skill --agent codex -y
```

The equivalent standard installer command is:

```bash
npx skills add StarryKit/starry-slides --skill starry-slides
```

## Roadmap

| Feature | Status | Notes |
| --- | --- | --- |
| HTML Contract validation | Done | Validates generated slide packages before editor import. |
| Manifest-based deck loading | Done | Loads `manifest.json`, slide HTML, titles, hidden state, and source files. |
| Browser editor for local decks | Done | Opens generated decks locally and writes committed edits back to disk. |
| Direct text editing | Done | Supports in-slide text edits with undo/redo and persistence. |
| Element selection and styling | Done | Supports editable text, image, block, and group elements through toolbar controls. |
| Block move, resize, rotate | Done | Persists supported layout edits through shared operations. |
| Slide sidebar operations | Done | Add, duplicate, delete, hide/show, reorder, and rename slides. |
| PDF and HTML export | Done | Exports visible deck output from the local runtime. |
| Editing-only release gate | In progress | Full `pnpm verify` release path and final release notes remain active work. |
| Deeper manipulation coverage | Planned | Broader resize/rotate regression coverage and UX polish. |
| Agent-backed generation UI | Planned | Product UI for prompt-to-deck generation. |
| Agent-backed slide modification | Planned | Proposed AI edits with preview, accept/reject, validation, undo/redo, and persistence. |
| Productized deployment | Planned | Runtime, storage, security, and deployment model beyond the local workflow. |

Detailed planning lives in [docs/roadmap/README.md](./docs/roadmap/README.md).

## Documentation

- [Development guide](./docs/development.md): repo layout, local commands, tests,
  and implementation boundaries.
- [Contributing guide](./docs/contributing.md): expectations for changes,
  verification, and review.
- [Slide Contract guide](./docs/slide-contract.md): deck package shape and
  required HTML attributes.
- [Repository context](./CONTEXT.md): repo rules, boundaries, testing
  expectations, and shared terminology.
- [Architecture decisions](./docs/adr/): accepted ADRs and ADR template.
- [Agent-facing skill](./skills/starry-slides/SKILL.md): generation
  workflow and protocol tools for agents.

## License

Starry Slides is licensed under [AGPL-3.0-only](./LICENSE).
