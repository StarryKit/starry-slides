# ADR-0016: Adopt a PDF export pipeline through core, runtime, CLI, and editor entry points

- Status: accepted
- Date: 2026-05-07

## Context

Starry Slides already has a browser-rendered preview pipeline in
`src/runtime/view-renderer.ts` and an editor header export menu placeholder in
`src/editor/components/editor-header.tsx`. The product now needs a real PDF
export path that can be triggered from both the CLI and the editor UI.

The export behavior must support three entry-level modes:

- export a single slide
- export the whole deck
- export a selected subset of slides

The implementation must keep shared decision logic in `src/core`, because the
export mode and slide selection semantics are part of the product contract, not
just UI behavior. The browser-side editor cannot create PDFs directly; the PDF
must be produced by Node runtime code that can launch Chromium and call
`page.pdf()`.

Existing architecture constraints:

- `src/core` must stay browser-safe and cannot depend on `src/runtime`
- `src/runtime` may depend on `src/core` for contract-aware helpers
- the CLI must remain agent-facing and machine-readable by default
- the editor header should trigger the same export pipeline, not a separate
  implementation

## Decision

Introduce a shared PDF export pipeline with the following structure:

1. `src/core` owns PDF export planning and slide-selection resolution.
   It exposes a small browser-safe API that resolves which slides belong in a
   PDF export request and validates the selection shape.
2. `src/runtime` owns the actual PDF generation. It loads slide HTML from a deck
   package, renders the selected slides in Chromium, and writes a PDF file or
   returns PDF bytes.
3. `src/cli` adds `starry-slides export pdf ...` as the agent-facing command
   surface for PDF export.
4. `src/editor` adds an export control in the header that calls a local Vite
   middleware endpoint, which reuses the same runtime exporter used by the CLI.

The export command shape is:

```bash
starry-slides export pdf [deck] --out <file>
starry-slides export pdf [deck] --all --out <file>
starry-slides export pdf [deck] --slide <manifest-file> --out <file>
starry-slides export pdf [deck] --slides <manifest-file> --out <file>
```

The editor entry point uses the same selection model, but it sends the request
to a local server endpoint instead of spawning a separate process.

The PDF exporter must preserve slide order from the manifest and must reject
slide references that do not match exact manifest `file` values.

## Consequences

- CLI and editor exports share one contract for slide selection and output
  layout.
- The export logic becomes testable at three layers: core selection rules,
  runtime PDF generation, and CLI/editor entry points.
- The editor export path depends on the Vite middleware runtime, so it works in
  local development and preview, not as a standalone browser-only action.
- Future export formats can reuse the same core selection model.

## Alternatives considered

- Put all export logic in the CLI. Rejected because the editor would duplicate
  selection rules.
- Generate PDFs in the browser. Rejected because the browser app cannot safely
  own the Chromium/PDF dependency or write files directly.
- Keep single-slide export only. Rejected because the product now needs both
  single and deck-level export modes.

## Implementation Plan

- **Affected paths**:
  - `src/core/pdf-export.ts` or equivalent new core module
  - `src/core/index.ts`
  - `src/runtime/pdf-export.ts` or equivalent new runtime module
  - `src/runtime/view-renderer.ts` if shared Chromium helpers are reused
  - `src/cli/index.ts`
  - `src/cli/index.test.ts`
  - `src/runtime/view-renderer.test.ts` or a new runtime PDF test file
  - `src/editor/components/editor-header.tsx`
  - `src/editor/app/use-slides-data.ts`
  - `vite.config.ts`
  - `docs/adr/README.md`

- **Pattern**:
  - use a core-owned selection resolver for `all`, `single slide`, and `selected slide files`
  - keep PDF generation in runtime and use Chromium `page.pdf()`
  - return machine-readable results from CLI commands and a binary PDF response from the editor endpoint
  - keep the editor header as a trigger only; it must not implement PDF generation itself

- **Tests**:
  - core tests cover selection resolution and manifest-file validation
  - runtime tests cover PDF generation output and selection order
  - CLI tests cover `export pdf` command parsing, JSON/file side effects, and exit codes
  - editor tests cover the export trigger path and the middleware endpoint contract

## Verification

- [ ] `starry-slides export pdf ...` writes a valid PDF file for a single slide
- [ ] `starry-slides export pdf ... --all` exports every manifest slide in order
- [ ] `starry-slides export pdf ... --slide <manifest-file>` exports exactly one slide
- [ ] `starry-slides export pdf ... --slides <manifest-file>` exports the requested subset in order
- [ ] the editor header can trigger the same export pipeline through the local runtime endpoint
- [ ] the exported PDF bytes begin with the PDF header and the output file is non-empty
- [ ] CLI and editor export behavior remain stable under automated tests
