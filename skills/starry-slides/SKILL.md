---
name: starry-slides
description: Generate contract-compatible HTML slide decks for Starry Slides. Use when the user wants to create or edit a deck source file, verify it with the `starry-slides` CLI, preview slides, or open a valid deck in the Starry Slides editor.
---

# Starry Slides

## Goal

Create or edit a contract-compatible slide deck files that follows `references/STARRY-SLIDES-CONTRACT.md`, then verify it with the `starry-slides` CLI and open it only after verification succeeds.

## What to Produce

- Produce a deck directory, not one monolithic HTML file.
- Include a `manifest.json` at the deck root.
- Put slide documents under `slides/`, with one standalone `.html` file per slide.
- Add optional supporting assets under paths such as `assets/` when the deck needs images or other local files.
- Make every manifest slide entry include at least `file` and `title`.
- Make every slide document contain exactly one `data-slide-root="true"` element.
- Mark every user-editable node with a supported `data-editable` value such as `text`, `image`, or `block`.
- Prefer stable `data-editor-id` values on the slide root and editable nodes.
- Keep authored content in normal HTML/CSS that remains compatible with verification, preview, and browser editing.

## CLI Access

- Install once, then use the CLI directly:

```bash
npm install -g starry-slides
starry-slides verify <deck>
starry-slides view <deck> --all
starry-slides open <deck>
```

## Workflow

1. Understand the user's slide context before generating anything. Use [REQUIREMENTS-DISCOVERY-INTERVIEW.md](references/REQUIREMENTS-DISCOVERY-INTERVIEW.md) to gather missing context, ask only the highest-signal questions, and consolidate the result into a brief before you generate.
2. Generate or edit the deck package so `manifest.json`, slide files, and any supporting assets satisfy the contract reference and reflect that context.
3. Verify the deck with:

```bash
starry-slides verify <deck>
```

4. If verification passes, open the deck with:

```bash
starry-slides open <deck>
```

5. For previews, use:

```bash
starry-slides view <deck> --all
starry-slides view <deck> --slide <manifest-file>
```

## Rules

- Do not invent a separate slide document format.
- Do not collapse the deck into a custom single-file wrapper format.
- Do not omit `manifest.json` or slide-level HTML files.
- Use exact manifest `file` values when calling `starry-slides view --slide`.
- Add `data-editable` markers to user-editable content so the editor and verifier can understand it.
- Keep hidden slides explicit through manifest metadata when needed.
- Treat `verify` JSON as the source of truth for pass/fail.
- Do not open the deck until verification returns `ok: true`.

## Reference

- Discovery interview: [REQUIREMENTS-DISCOVERY-INTERVIEW.md](references/REQUIREMENTS-DISCOVERY-INTERVIEW.md)
- Contract details: [STARRY-SLIDES-CONTRACT.md](references/STARRY-SLIDES-CONTRACT.md)
