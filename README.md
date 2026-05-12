![starry kit banner](assets/readme-banner.png)

# Starry Slides

Starry Slides is an agentic editor for slides and presentations using HTML as the source file.

The project mainly contains 3 parts:

1. `starry-slides` CLI

   Tools for agents to preview, verify, and open generated slide HTML files.

2. Starry Slide Editor

   A WYSIWYG editor for creating and editing slide HTML files.

3. `/starry-slides` Skill

   A thin local skill shell that points agents to the authoritative Starry
   Slides references under [`docs/skills-references/`](./docs/skills-references/).

## Skill Quick Start

Install the Starry Slides skill with the `skills` CLI:

```bash
npx skills add StarryKit/starry-slides --skill starry-slides
```

Then start with a simple prompt like:

```text
Use /starry-slides to create a slide deck for my presentation.
```

## CLI Quick Start

Install the CLI globally:

```bash
npm install -g starry-slides
```

Use it to verify, preview, and open decks:

```bash
starry-slides verify <deck>
starry-slides view <deck> --all
starry-slides open <deck>
```

- `verify` checks whether a deck HTML file follows the contract and prints JSON results.
- `view` renders preview images for one slide or the whole deck.
- `open` runs verification first, then opens the deck in the editor when it passes.

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
- [Architecture decisions](./docs/adr/): accepted ADRs and ADR template.

## License

Starry Slides is licensed under [MIT License](./LICENSE).
