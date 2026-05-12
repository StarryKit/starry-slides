---
name: starry-slides
description: Create polished HTML slide decks and presentations with Starry Slides. Use this skill to generate, edit, verify, preview, and open editable presentation decks with the Starry Slides CLI and visual editor.
---

# Starry Slides

## Goal

Create or edit contract-compatible slide deck files with the local `starry-slides`
CLI and the authoritative remote Starry Slides references.

## Pre-requisites

Install the Starry Slides CLI first:

```bash
npm install -g starry-slides
```

Then install the required Playwright and Chromium dependencies before running
render-based verification or preview commands.

## Authoritative Remote References

Use these remote documents as the source of truth:

- [Starry Slides contract](https://github.com/StarryKit/starry-slides/blob/main/docs/skills-references/STARRY-SLIDES-CONTRACT.md)
- [Starry Slides CLI usage](https://github.com/StarryKit/starry-slides/blob/main/docs/skills-references/STARRY-SLIDES-CLI-USAGE.md)
- [Slides discovery interview](https://github.com/StarryKit/starry-slides/blob/main/docs/skills-references/REQUIREMENTS-DISCOVERY-INTERVIEW.md)

The local skill shell stays intentionally thin. High-change workflow guidance,
contract details, and CLI usage notes live in those repository documents.

## Workflow

1. Make sure the `starry-slides` CLI is installed.
2. Load the remote contract, CLI usage, and discovery references above before
   generating or editing deck files.
3. Understand the user's slide context before generating anything. Use the
   remote discovery interview guide to gather only the missing high-signal
   context and consolidate it into a brief.
4. Generate or edit the deck package so it satisfies the remote contract
   reference.
5. Use the local CLI for verification, previewing, and editing:

```bash
starry-slides verify <deck>
starry-slides view <deck> --all
starry-slides open <deck>
```
