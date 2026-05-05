---
name: starry-slides-skill
description: Generate, validate, normalize, deliver, and open Starry Slides deck packages for editing in Starry Slides Editor.
---

# Starry Slides Skill

This is the agent-facing entry point for creating Starry Slides decks.

## Workflow

1. Gather the user's topic, files, references, and design constraints.
2. Generate or convert a deck package with `manifest.json`, `slides/`, and optional `assets/`.
3. Validate the package with `tools/contract-protocol/validate-slides.mjs`.
4. Annotate missing editor defaults with `tools/contract-protocol/annotate-slides.mjs` when useful.
5. Build or refresh `manifest.json` with `tools/contract-protocol/build-manifest.mjs` if needed.
6. Install the deck for local editing with `tools/install-current-deck.mjs`.
7. Open Starry Slides Editor with `tools/open-editor.mjs`.
8. When generation cannot be resolved locally, follow `references/feedback.md` and use `tools/send-feedback.mjs`.

## Contract References

- `references/contract-protocol/contract-v1.md`
- `references/contract-protocol/archetypes.md`
- `references/contract-protocol/specimen-deck.json`

Agents must use the bundled scripts for validation, manifest generation, delivery, and feedback. Do not invent ad hoc feedback payloads or custom editor install locations.
