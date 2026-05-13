<p align="center">
  <img src="./src/editor/assets/logo-starry-slides.png" alt="Starry Slides" width="420" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/starry-slides">
    <img src="https://img.shields.io/npm/v/starry-slides" alt="NPM version" />
  </a>
  <a href="https://github.com/StarryKit/starry-slides/actions/workflows/pr-e2e.yml">
    <img src="https://github.com/StarryKit/starry-slides/actions/workflows/pr-e2e.yml/badge.svg" alt="E2E Tests" />
  </a>
</p>

<p align="center">
  English | <a href="./README.zh-CN.md">简体中文</a>
</p>

Starry Slides is a slide/presentation editor that gives your agent ability to generate fully editable slides with HTML as the source file.

## Features

<table>
  <thead>
    <tr>
      <th align="left">Feature</th>
      <th align="left">What it means</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>HTML as Source File</strong></td>
      <td>Slides are authored as HTML, so the original deck format stays open, inspectable, and easy to version.</td>
    </tr>
    <tr>
      <td><strong>Fully editable slides</strong></td>
      <td>Generated decks are not locked artifacts. You can open them, tweak them, and keep editing visually.</td>
    </tr>
    <tr>
      <td><strong>WYSIWYG Editing Experience</strong></td>
      <td>Edit slides directly in a visual interface and see the result as you work, without giving up the underlying HTML source.</td>
    </tr>
    <tr>
      <td><strong>User-Controlled Context</strong></td>
      <td>Starry Slides does not include built-in templates or built-in style instructions. It focuses on making slides editable, while design style and content are fully controlled by the context you provide.</td>
    </tr>
    <tr>
      <td><strong>Editing with Your Own Agent Editing</strong></td>
      <td>Use the agent you already work with. Starry Slides adds slide workflows without introducing a separate agent layer.</td>
    </tr>
  </tbody>
</table>

## Install Skill to your Agent
>>>>>>> main

```bash
npx skills add StarryKit/starry-slides --skill starry-slides
```

## Skill Usage

### Simple request

The `/starry-slides` skill has built-in interview workflow to collect your requirements.

```text
/starry-slides to create a slide deck for my presentation.
```

### Create a more specific deck

```text
/starry-slides Create a slide deck that explains large language models.

Requirements:
1. Length: about 8 slides
2. Style: minimalist
3. Scenario: I need to present it at a conference for a live audience
```

### Create with a specific template/style you like:

```text
/starry-slides Use the visual style of the "Split Pastel" deck from this frontend-slides repository as reference and create an 8-slide deck explaining how large language models work: https://github.com/zarazhangrui/frontend-slides
```

### Revise an existing deck

<<<<<<< codex/0028-adr
Runtime upgrades are notify-only. CLI commands never auto-install a newer
version; update notices, when present, are written to `stderr` so structured
`stdout` stays parseable.


## Documentation

- [Roadmap](./docs/roadmap/README.md): roadmap of progress and future plans 
- [Development guide](./docs/development.md): repo layout, local commands, tests,
  and implementation boundaries.
- [Contributing guide](./docs/contributing.md): expectations for changes,
  verification, and review.
- [Skill references](./docs/skills-references/): authoritative contract, CLI usage, and
  discovery documents used by the installed skill.
- [Slide Contract guide](./docs/skills-references/STARRY-SLIDES-CONTRACT.md): deck package shape and
  required HTML attributes.
- [Repository context](./CONTEXT.md): repo rules, boundaries, testing
  expectations, and shared terminology.
=======
```text
/starry-slides to update this deck so it feels more premium and modern, shorten dense slides, and preserve all content accuracy.
```

## Documentation

- [CLI Usage](./skills/starry-slides/references/STARRY-SLIDES-CLI-USAGE.md): installation, commands, and examples for the `starry-slides` CLI.
- [Roadmap](./docs/roadmap/README.md): roadmap of progress and future plans.
- [Development guide](./docs/development.md): repo layout, local commands, tests, and implementation boundaries.
- [Contributing guide](./docs/contributing.md): expectations for changes, verification, and review.
- [Slide Contract guide](./skills/starry-slides/references/STARRY-SLIDES-CONTRACT.md): deck package shape and required HTML attributes.
- [Repository context](./CONTEXT.md): repo rules, boundaries, testing expectations, and shared terminology.
>>>>>>> main
- [Architecture decisions](./docs/adr/): accepted ADRs and ADR template.

## License

<<<<<<< codex/0028-adr
Starry Slides is licensed under [MIT License](./LICENSE).
=======
Starry Slides is licensed under the [MIT License](./LICENSE).
>>>>>>> main
