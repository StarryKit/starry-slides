# ADR-0018: Adopt a progressive PDF export dialog in the editor

- Status: accepted
- Date: 2026-05-07

## Context

ADR-0016 established the shared PDF export pipeline and the editor header entry
point. The first editor interaction exposed PDF scopes directly in the Export
dropdown, including separate items for current-slide PDF and selected-slides
PDF. That made the dropdown responsible for too many export decisions and left
the selected-slides path dependent on a browser prompt for manifest file names.

The editor now needs a progressive interaction:

1. The user opens the Export dropdown.
2. The user chooses the PDF format.
3. A dedicated PDF export dialog asks which slides to export.
4. The dialog submits the same core `PdfExportSelection` contract used by the
   existing runtime endpoint.

This change is an editor interaction architecture decision because it changes
the user-facing command surface for an accepted export pipeline and affects how
future export formats should gather format-specific options.

## Decision

Keep the Export dropdown as a format picker only. The dropdown must show PDF as
one export format and must not expose separate current-slide or selected-slides
PDF commands.

When PDF is chosen, open a modal dialog that owns PDF-specific scope selection.
The dialog must offer:

- all slides
- selected slides chosen from the deck's manifest-backed slide list

The modal must be visually centered in the viewport. When selected-slides mode
is active, the slide picker must render each exportable slide with its
thumbnail, slide number, and title so users can choose by visual content instead
of manifest filenames.

The dialog submits a `PdfExportSelection`:

- all slides -> `{ mode: "all" }`
- selected slides -> `{ mode: "slides", slideFiles }`

The editor still sends the selection through the existing `onExportPdf` callback
and local runtime endpoint from ADR-0016. The dialog must not generate PDFs or
duplicate runtime selection validation.

## Consequences

- Export format choice and PDF scope choice are separated, which keeps the
  dropdown small as more formats arrive.
- PDF scope selection becomes inspectable and testable in E2E without relying on
  `window.prompt`.
- The editor header needs enough slide metadata to render PDF scope choices, but
  PDF generation remains outside the browser UI.
- The editor header also receives already-rendered slide thumbnails from the
  same thumbnail pipeline used by the sidebar; it must not start a separate
  thumbnail renderer.
- Future export formats with options should follow the same pattern: choose the
  format in the dropdown, then gather format-specific settings in a dialog.

## Alternatives considered

- Keep direct PDF scope items in the dropdown. Rejected because the dropdown
  mixes format selection with format-specific configuration and does not scale.
- Keep the selected-slides prompt. Rejected because manifest-file text input is
  not a user-facing selection experience and is brittle in automated tests.
- Put the PDF scope dialog outside the header. Rejected for now because the
  header already owns export command UI; the dialog remains a trigger surface and
  still delegates export execution.

## Implementation Plan

- **Affected paths**:
  - `src/editor/components/editor-header.tsx`
  - `src/editor/index.tsx`
  - `src/editor/hooks/use-slide-thumbnails.ts` only if thumbnail production
    needs to change
  - `e2e/tests/editor-chrome.spec.ts`
  - `docs/adr/README.md`

- **Pattern**:
  - keep the Export dropdown limited to export formats
  - add a PDF export dialog rendered from the editor header
  - center the PDF dialog with explicit layout classes rather than relying on
    browser `<dialog>` default positioning
  - pass manifest-backed slide metadata and sidebar thumbnail data from
    `SlidesEditor` into the header
  - render selected-slide choices as compact thumbnail cards with a checkbox,
    slide number, and title
  - submit core `PdfExportSelection` objects through the existing `onExportPdf`
    callback
  - avoid `window.prompt` for selected slide export

- **Tests**:
- E2E opens the Export dropdown, chooses PDF, and verifies a dialog appears
- E2E verifies the dropdown no longer contains direct PDF scope actions
- E2E verifies the PDF dialog is centered in the viewport
- E2E verifies selected-slides mode shows slide thumbnails with numbers and
    titles
  - E2E chooses selected slides in the dialog and asserts the runtime endpoint
    receives `mode: "slides"` with the selected manifest files
  - E2E chooses all slides in the dialog and asserts the runtime endpoint
    receives `mode: "all"`

## Verification

- [ ] Export dropdown exposes PDF as a format, not separate PDF scope commands
- [ ] Clicking PDF opens a modal dialog instead of immediately exporting
- [ ] The PDF dialog is visually centered in the viewport
- [ ] The PDF dialog does not expose a current-slide option
- [ ] Selected-slides mode renders thumbnail cards with slide number and title
- [ ] The dialog can submit all slides through the existing PDF export endpoint
- [ ] The dialog can submit a chosen subset of slides through the existing PDF
      export endpoint
- [ ] Editor E2E tests cover the progressive PDF export interaction
