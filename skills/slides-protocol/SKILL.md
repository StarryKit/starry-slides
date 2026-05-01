---
name: slides-protocol
description: Define, validate, and normalize protocol-compatible HTML slides. Use when creating a new style pack, checking whether slide HTML can be parsed by the editor, or generating a manifest for a specimen or demo deck.
---

# Slides Protocol

This skill is a headless package for editable HTML slides.

It combines:

- context assets: the protocol spec, archetype definitions, and canonical specimen content
- executable tools: validators, annotators, and manifest builders

Use this skill when the job is to make HTML slides compatible with this repo's parser/editor contract, not when the main task is visual design by itself.

## Context assets

Read these before editing or generating a protocol-compatible style pack:

1. `references/contract-v1.md`
   Defines the single protocol layer for editable HTML slides, including required fields, optional fields, and defaults.

2. `references/archetypes.md`
   Defines the fixed page forms a v1 style pack should implement.

3. `references/specimen-deck.json`
   Provides the canonical content used to exercise every archetype with the same sample deck.

## Tools

Use these tools during execution:

- `tools/create-style-pack.mjs`
  Copy the starter visual package into a new directory so work can begin from a protocol-compatible baseline.

- `tools/validate-slides.mjs`
  Validate one HTML file or a directory of slides against the protocol.

- `tools/annotate-slides.mjs`
  Add missing defaults such as slide root dimensions and stable `data-editor-id` values.

- `tools/build-manifest.mjs`
  Generate a `manifest.json` from a directory of protocol-compatible slide HTML files.

## Expected workflow

1. Read the protocol spec.
2. Map the target slide pack to the fixed archetypes.
3. Use the canonical specimen deck as the standard test content.
4. Validate the HTML.
5. Annotate missing defaults if needed.
6. Build the manifest.

The protocol skill does not impose a visual style. It only constrains HTML semantics so the editor can parse, select, and edit the deck reliably.
