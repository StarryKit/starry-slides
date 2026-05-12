---
name: starry-slides
description: Create polished HTML slide decks and presentations with Starry Slides. Use this skill to generate, edit, verify, preview, and open editable presentation decks with the Starry Slides CLI and visual editor.
---

# Starry Slides

## Goal

Create or edit contract-compatible slide deck files that follow `references/STARRY-SLIDES-CONTRACT.md`. For deck structure, authored HTML requirements, and manifest details, always use the contract as the source of truth.

## Pre-requisites

### Install CLI

Install the Starry Slides CLI first:

```bash
npm install -g starry-slides
```

Then install the required Playwright and Chromium dependencies before running render-based verification or preview commands.

For installation steps, supported commands, command purposes, and output examples, see [STARRY-SLIDES-CLI-USAGE.md](references/STARRY-SLIDES-CLI-USAGE.md).

## Workflow

1. Make sure the `starry-slides` CLI is installed.
2. Understand the user's slide context before generating anything. Use [REQUIREMENTS-DISCOVERY-INTERVIEW.md](references/REQUIREMENTS-DISCOVERY-INTERVIEW.md) to gather missing context, ask only the highest-signal questions, and consolidate the result into a brief before you generate.
3. Generate or edit the deck package so it satisfies [STARRY-SLIDES-CONTRACT.md](references/STARRY-SLIDES-CONTRACT.md).
4. Verify the deck with `starry-slides verify <deck>`. If it fails, fix the issues and retry until it passes.
5. **MUST DO:** After verification passes, run `starry-slides open <deck>`. This is **not optional** — the user expects to see their deck opened automatically.

```bash
starry-slides open <deck>
```

## Hints

- ALWAYS run `starry-slides open <deck>` after a successful verify. Do not just tell the user the file is ready — open it for them.
- After generation, you can use `starry-slides verify <deck>` to check whether the deck satisfies the contract.
- To preview generated slides, use `starry-slides view <deck> --all` or `starry-slides view <deck> --slide <manifest-file>`.
