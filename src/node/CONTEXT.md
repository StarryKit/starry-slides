# Node Context

## Purpose

`src/node` owns Node-only concerns for verifying, previewing, exporting,
opening, and serving deck packages inside `@starrykit/slides`.

Shared roadmap lives in
[ROADMAP.md](/Users/haichao/code/starry-slides/ROADMAP.md).

This module is responsible for:

- resolving the deck path used by `starry-slides`
- choosing local ports for the editor server
- opening the browser after the editor server starts
- supporting CLI preview rendering for deck packages
- supporting PDF and single HTML export from deck packages
- supporting local deck mounting through the Vite deck runtime middleware

`src/node/deck-runtime-middleware.ts` owns the dev and preview middleware
implementation used by the root `vite.config.ts` Adapter. It serves:

- `/deck/*` for the active deck package
- `/__editor/save-generated-deck` for local write-back
- `/__editor/reset-generated-deck` for test reset behavior

## Content Sources

Normal local development serves the ignored local sample deck:

- `sample-slides/`

If that directory is missing in a fresh checkout, create it with
`pnpm editor:e2e:generate-deck`.

CLI opening uses `STARRY_SLIDES_DECK_DIR` to mount the deck passed to
`starry-slides open`.

E2E runs use an ignored temporary deck in `.e2e-test-slides/`. That directory is
served only when the Vite process runs with `STARRY_SLIDES_DECK_SOURCE=e2e`.

The app does not maintain a fallback deck. The selected deck must be a
Contract-compatible deck package.

## Language

**Starry Slides CLI**:
The agent-facing `starry-slides` command for verifying, previewing, and opening
deck packages.
_Avoid_: sslides, separate view tool

**Preview Render**:
A PNG rendering of one slide or every slide in a deck package produced by
`starry-slides view`.
_Avoid_: screenshot, export

**Preview Manifest**:
The JSON object written to stdout by `starry-slides view` that lists generated
preview image files.
_Avoid_: log output, binary output

**Manifest Slide File**:
The exact `file` value for a slide entry in `manifest.json`.
_Avoid_: slide index, slide title, slug

**View Output Directory**:
The directory where `starry-slides view` writes preview image files.
_Avoid_: export folder, screenshot folder

**Complete Verify**:
The validation workflow run by `starry-slides verify`, including structure
checks and overflow checks.
_Avoid_: optional overflow check, quick verify

**Static Verify**:
The explicit `starry-slides verify --static` mode that skips rendered checks.
_Avoid_: complete verify, fast complete verify

**Verify Result**:
The structured JSON result written to stdout by `starry-slides verify`.
_Avoid_: log text, console report

**Allowed Overflow**:
Overflow that is intentionally exempted from Complete Verify by
`data-allow-overflow="true"` on an element or ancestor.
_Avoid_: ignored overflow, tolerated overflow

## Relationships

- `starry-slides view` is a **Starry Slides CLI** subcommand.
- `sslides` is legacy naming and is not a target compatibility alias.
- `starry-slides view` runs **Static Verify** before rendering previews.
- A **Preview Render** may target one **Manifest Slide File** or every slide in
  a deck package.
- `starry-slides view` writes **Preview Render** files to disk and writes a
  **Preview Manifest** to stdout.
- `starry-slides view --slide` accepts only a **Manifest Slide File**, not a
  numeric index, title, or inferred slug id.
- The default **View Output Directory** is `<deck>/.starry-slides/view/`.
- Each view run clears stale Starry Slides preview files from the target
  **View Output Directory** before writing new preview files.
- Preview filenames are derived from **Manifest Slide File** values in a stable
  collision-resistant way.
- Human-readable view logs go to stderr so stdout remains parseable.
- `starry-slides open` must run **Complete Verify** before starting the editor.
- Overflow detection is part of **Complete Verify**.
- `starry-slides verify --static` runs **Static Verify** and does not perform
  rendered overflow checks.
- `starry-slides open` must not use **Static Verify**.
- `starry-slides verify` writes a **Verify Result** to stdout by default.
- Structural issues and overflow issues are reported together in one
  **Verify Result**.
- Overflow is an error unless it is **Allowed Overflow**.
- Shadows, glows, blur, and similar decorative CSS effects are not first-version
  overflow errors.

## Example dialogue

> **Dev:** "Should an agent call `sslides verify --check-overflow` before
> opening a deck?"
> **Domain expert:** "No. The agent should call `starry-slides verify`; overflow
> detection is part of Complete Verify."

> **Dev:** "Can an agent run a faster check while iterating?"
> **Domain expert:** "Yes, it can call `starry-slides verify --static`, but that
> skips rendered overflow checks."

> **Dev:** "Should view block on rendered overflow before producing previews?"
> **Domain expert:** "No. View runs Static Verify, then renders previews so the
> agent can inspect visual issues."

> **Dev:** "Should `starry-slides view` print image bytes to stdout?"
> **Domain expert:** "No. It writes PNG files and returns a Preview Manifest on
> stdout."

> **Dev:** "Can an agent request `--slide 3`?"
> **Domain expert:** "No. The agent reads `manifest.json` and passes the exact
> Manifest Slide File."

> **Dev:** "Can previews accumulate across runs?"
> **Domain expert:** "No. The view command clears stale preview files in its
> View Output Directory before writing the new Preview Manifest."

> **Dev:** "Can verify print a free-form text report by default?"
> **Domain expert:** "No. Verify is agent-facing, so stdout is a structured
> Verify Result."

> **Dev:** "This element intentionally clips or scrolls. How do we stop verify
> from failing it?"
> **Domain expert:** "Mark it or an ancestor as Allowed Overflow with
> `data-allow-overflow=\"true\"`."

## Boundaries

`src/node` may depend on `src/core` when runtime behavior needs validation or
contract-aware helpers. It must not own editor interaction semantics or duplicate
core document operations.
