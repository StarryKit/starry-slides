# ADR-0011: Adopt starry-slides as the agent-facing CLI

- Status: accepted
- Date: 2026-05-06

## Context

ADR-0008 introduced the single-package CLI under the short `sslides` command.
The CLI is primarily consumed by agents rather than humans, so concise naming is
less valuable than explicit command semantics.

## Decision

The product CLI command is `starry-slides`. `sslides` is no longer the target
agent-facing command name.

`sslides` is not retained as a compatibility alias in the target
implementation unless a later release-compatibility need is identified.

`starry-slides view` is a subcommand of the same CLI, not a separate tool. It
supports previewing one slide and generating previews for all slides.

`starry-slides verify` includes both static checks and rendered overflow
detection in the normal verification workflow. Rendered overflow checking is
part of default verify, not an opt-in flag. `starry-slides open` must run this
same complete verify workflow before starting the editor.

The target command shape is:

```bash
starry-slides [deck]
starry-slides open [deck]
starry-slides verify [deck]
starry-slides view [deck] --slide <manifest-file>
starry-slides view [deck] --all
starry-slides add-skill
```

`starry-slides [deck]` is equivalent to `starry-slides open [deck]`.

`starry-slides view` has two modes:

- single-slide preview: render and return one slide preview image selected by
  manifest `file`
- all-slides preview: render and return preview images for the whole deck

Preview rendering belongs to the Starry Slides CLI runtime. It should not be
implemented as a separate standalone CLI.

`starry-slides view` runs the same complete verify workflow as
`starry-slides verify` before rendering previews. If verification fails, view
must return the Verify Result JSON and skip preview generation.

`--slide` accepts only an exact `manifest.json` slide `file` value. It does not
accept numeric indexes, slide titles, or inferred slug ids. Agents are expected
to read the manifest and pass the file path explicitly, which avoids ambiguous
index or title semantics.

Preview files default to `<deck>/.starry-slides/view/`. Each view run should
clear previous Starry Slides preview files from the target output directory
before writing new results, so agents do not read stale previews. `--out-dir`
may override the output directory.

Preview filenames are derived from the manifest slide `file` value in a stable
collision-resistant way. For example, `slides/intro.html` may become
`slides-intro.png`, rather than just `intro.png`, so same-named files in
different directories do not collide.

### View output contract

`starry-slides view` writes preview PNG files to disk and writes a structured
JSON manifest to stdout. It must not stream image binaries to stdout.

Human-readable progress logs, warnings, and diagnostic messages should go to
stderr so agents can parse stdout reliably.

Example stdout shape:

```json
{
  "deck": "/absolute/path/to/deck",
  "mode": "single",
  "slides": [
    {
      "index": 3,
      "slideFile": "slides/title.html",
      "file": "slides-title.png",
      "path": "/absolute/path/to/deck/.starry-slides/view/slides-title.png",
      "width": 1920,
      "height": 1080,
      "scale": 1
    }
  ]
}
```

`starry-slides verify` must report structural contract errors and overflow
errors in one workflow. Default verify includes fast static checks where
possible and rendered checks where layout information is required. When verify
fails, `starry-slides open` must not start the editor.

### Verify output contract

`starry-slides verify` is agent-facing. Its default stdout should be structured
JSON, not ad hoc text. Human-readable summaries can be added later through an
explicit format option or stderr output, but stdout must remain parseable by
default.

The verify result shape should include the mode that ran:

```json
{
  "ok": false,
  "deck": "/absolute/path/to/deck",
  "mode": "complete",
  "checks": ["structure", "overflow"],
  "issues": [
    {
      "severity": "error",
      "code": "overflow.element",
      "slideFile": "03-title.html",
      "selector": "[data-editor-id=\"title-1\"]",
      "message": "Element content overflows vertically",
      "details": {
        "axis": "y",
        "overflowPx": 24
      }
    }
  ],
  "summary": {
    "errorCount": 1,
    "warningCount": 0
  }
}
```

Successful verification exits with code `0`; failed verification exits with
code `1`. Structural contract issues and overflow issues should be reported in
the same `issues` array. `starry-slides open` should reuse the same complete
verify result before deciding whether to start the editor.

`mode` is `"complete"` for `starry-slides verify`.

### Overflow verification rules

By default, overflow is an error:

- slide root or document body horizontal/vertical scroll overflow is
  `overflow.slide`
- editable element content overflow, such as `scrollWidth > clientWidth` or
  `scrollHeight > clientHeight`, is `overflow.element-content`
- an editable element's transformed visual bounding box extending outside the
  slide root is `overflow.element-bounds`

Overflow is allowed only when the element or an ancestor is explicitly marked
with `data-allow-overflow="true"`.

First-version overflow verification should not treat shadows, glows, blur, or
similar decorative CSS visual effects as overflow errors. These effects can
extend visually outside a box without indicating unsatisfactory slide content
layout.

Rendered overflow detection is programmatic. Agents consume structured overflow
issues from the Verify Result; they do not visually inspect preview images to
decide whether overflow occurred.

Static overflow checks can only catch explicit geometry problems available from
HTML and CSS source. Rendered overflow checks use Chromium layout measurements
such as scroll dimensions and bounding rectangles.

## Consequences

Documentation, package scripts, skill tooling, and runtime context should use
`starry-slides` when referring to the CLI. Existing `sslides` references are
legacy naming and should be migrated unless temporary compatibility is
explicitly needed during implementation.

Because this CLI is agent-facing, command names and output should prioritize
semantic clarity and machine-readable/actionable results over short aliases.
