![](assets/readme-banner.png)

> **The project is currently under development and has not made a release version yet. Please stay tuned for future progress.**

# Starry Slides

Starry Slides is an agentic editor for slides and presentations using HTML as the source file.

The project mainly contains 3 parts:

| Part                   | Description                                                                                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `starry-slides` CLI    | Tools for agents to preview, verify, and open generated slide HTML files.                                                                                                        |
| Starry Slide Editor    | A WYSIWYG editor for creating and editing slide HTML files.                                                                                                                      |
| `/starry-slides` Skill | A skill that teaches your agent to generate HTML files that meet the requirements of [`STARRY-SLIDES-CONTRACT.md`](./skills/starry-slides/references/STARRY-SLIDES-CONTRACT.md). |


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

## Skill Quick Start

Install the Starry Slides skill with the `skills` CLI:

```bash
npx skills add StarryKit/starry-slides --skill starry-slides
```

Then start with a simple prompt like:

```text
Use /starry-slides to create a slide deck for my presentation.
```

## Documentation

- [Roadmap](./docs/roadmap/README.md): roadmap of progress and future plans 
- [Development guide](./docs/development.md): repo layout, local commands, tests,
  and implementation boundaries.
- [Contributing guide](./docs/contributing.md): expectations for changes,
  verification, and review.
- [Slide Contract guide](./skills/starry-slides/references/STARRY-SLIDES-CONTRACT.md): deck package shape and
  required HTML attributes.
- [Repository context](./CONTEXT.md): repo rules, boundaries, testing
  expectations, and shared terminology.
- [Architecture decisions](./docs/adr/): accepted ADRs and ADR template.

## License

Starry Slides is licensed under [MIT License](./LICENSE).
