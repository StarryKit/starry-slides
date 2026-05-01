---
name: slides-style-pack-starter
description: Starter package for building a protocol-compatible HTML slide style pack. Use when creating a new visual language that must implement the fixed v1 archetypes against the canonical specimen deck.
---

# Slides Style Pack Starter

This skill is a starter package for the visual layer.

It is intentionally separate from `slides-protocol`:

- `slides-protocol` defines HTML semantics, defaults, and validation
- `slides-style-pack-starter` demonstrates how one style pack implements the fixed v1 archetypes

## What this package contains

- `template/style-pack.json`
  Metadata for the style pack and the slices it provides.

- `template/slices/*.html`
  One slice per v1 archetype, already marked with protocol-compatible attributes.

## How to use it

1. Read `../slides-protocol/references/contract-v1.md`.
2. Read `../slides-protocol/references/archetypes.md`.
3. Read `../slides-protocol/references/specimen-deck.json`.
4. Copy `template/` to a new style-pack directory.
5. Replace the starter visuals while preserving protocol semantics.
6. Validate the result with `slides-protocol/tools/validate-slides.mjs`.
7. Generate a manifest with `slides-protocol/tools/build-manifest.mjs`.

## v1 expectations

- Keep the same fixed archetype coverage.
- Treat the specimen deck as the canonical content sample.
- Keep decorative layers separate from editable content.
- Do not make the style pack depend on one specific user topic.

The output should feel like a reusable visual system, not a one-off generated deck.
