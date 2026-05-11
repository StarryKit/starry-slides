---
name: starry-slides
description: Generate contract-compatible HTML slide decks for Starry Slides. Use when the user wants to create or edit a deck source file, verify it with the `starry-slides` CLI, preview slides, or open a valid deck in the Starry Slides editor.
---

# Starry Slides

## Goal

Create or edit a single HTML deck file that follows `references/STARRY-SLIDES-CONTRACT.md`, then verify it with the `starry-slides` CLI and open it only after verification succeeds.

## What to Produce

- Use one self-contained deck HTML file.
- Use `<slides>` as the deck root and one or more `<slide>` children.
- Give every `<slide>` a stable `id` and human-readable `title`.
- Keep authored content editable inside each slide.
- Use normal HTML for runtime CSS/JS and assets.
- Prefer the deck shape already used by `sample-slides/deck.html` when creating a new deck.

## CLI Access

- Install once, then use the CLI directly:

```bash
npm install -g starry-slides
starry-slides verify <deck>
starry-slides view <deck> --all
starry-slides open <deck>
```

## Workflow

1. Understand the user's slide context before generating anything. Use [SLIDES-DISCOVERY-INTERVIEW.md](references/SLIDES-DISCOVERY-INTERVIEW.md) to gather missing context, ask only the highest-signal questions, and consolidate the result into a brief before you generate.
2. Generate or edit the deck HTML to satisfy the contract reference and reflect that context.
3. Verify the deck with:

```bash
starry-slides verify <deck>
```

4. Use `--static` when you only need fast structural validation:

```bash
starry-slides verify <deck> --static
```

5. If verification passes, open the deck with:

```bash
starry-slides open <deck>
```

6. For previews, use:

```bash
starry-slides view <deck> --all
starry-slides view <deck> --slide <slide-id>
```

## Rules

- Do not invent a separate slide document format.
- Do not add `data-editable` markers unless the existing deck pattern requires them.
- Keep hidden slides explicit with `slide-hidden="true"` only when needed.
- Treat `verify` JSON as the source of truth for pass/fail.
- Do not open the deck until verification returns `ok: true`.

## Reference

- Discovery interview: [SLIDES-DISCOVERY-INTERVIEW.md](references/SLIDES-DISCOVERY-INTERVIEW.md)
- Contract details: [STARRY-SLIDES-CONTRACT.md](references/STARRY-SLIDES-CONTRACT.md)
