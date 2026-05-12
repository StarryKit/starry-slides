# Starry Slides CLI Usage

This document explains how to install the Starry Slides CLI, which commands it
currently supports, and what each command returns.

## Install the CLI

If the CLI is not installed yet, install it with:

```bash
npm install -g starry-slides
```

You can then run:

```bash
starry-slides --help
```

Expected help output shape:

```text
Usage: starry-slides [options] [command] [deck]
```

## Supported Commands

The CLI currently supports these command forms:

- `starry-slides verify [deck]`
- `starry-slides view [deck] --all`
- `starry-slides view [deck] --slide <manifest-file>`
- `starry-slides open [deck]`
- `starry-slides [deck]`

The last form is shorthand for `starry-slides open [deck]`.

## Runtime Update Notifications

Runtime updates are notify-only.

- normal deck commands never auto-install a newer runtime
- JSON or other structured command results stay on stdout
- runtime update notices, when present, go to stderr
- CI may suppress runtime update notices entirely

When a newer runtime is available, the CLI writes an agent-facing stderr notice
in this shape:

```text
Starry Slides runtime update available: current=0.1.4 latest=0.1.5.
Agent action: upgrade the runtime package after this command completes.
Run: npm install -g starry-slides@latest
Current command may continue under the installed runtime.
```

## `verify`

Use `verify` to run full deck verification and print a JSON result.

```bash
starry-slides verify <deck>
```

What it does:

- resolves the target deck path
- runs structure checks
- runs static overflow checks
- runs rendered overflow checks
- prints a JSON result to stdout
- may print a runtime update notice to stderr
- exits with code `0` when `ok: true`, otherwise exits with code `1`

Example success result:

```json
{
  "deck": "/absolute/path/to/deck",
  "mode": "complete",
  "ok": true,
  "checks": ["structure", "static-overflow", "rendered-overflow"],
  "issues": []
}
```

Example failure result:

```json
{
  "deck": "/absolute/path/to/deck",
  "mode": "complete",
  "ok": false,
  "checks": ["structure", "static-overflow", "rendered-overflow"],
  "issues": [
    {
      "level": "error",
      "code": "structure.empty-manifest",
      "message": "manifest must declare at least one slide"
    }
  ]
}
```

## `view`

Use `view` to render preview images for a deck.

Render every manifest slide:

```bash
starry-slides view <deck> --all
```

Render one specific manifest slide:

```bash
starry-slides view <deck> --slide slides/01-title.html
```

Optionally write previews to a specific directory:

```bash
starry-slides view <deck> --all --out-dir ./previews
```

What it does:

- requires either `--all` or `--slide <manifest-file>`
- runs full `verify` first
- stops immediately if verification fails
- renders preview images as `.png` files
- prints a JSON manifest describing the rendered previews to stdout
- may print a runtime update notice to stderr

Example `--all` result:

```json
{
  "deck": "/absolute/path/to/deck",
  "mode": "all",
  "outputDir": "/absolute/path/to/deck/.starry-slides/view",
  "slides": [
    {
      "index": 0,
      "slideFile": "slides/01-title.html",
      "title": "Title",
      "file": "slides__01-title.png",
      "path": "/absolute/path/to/deck/.starry-slides/view/slides__01-title.png",
      "width": 1920,
      "height": 1080,
      "scale": 1
    }
  ]
}
```

Example `--slide` result:

```json
{
  "deck": "/absolute/path/to/deck",
  "mode": "single",
  "outputDir": "/absolute/path/to/deck/.starry-slides/view",
  "slides": [
    {
      "index": 0,
      "slideFile": "slides/01-title.html",
      "title": "Title",
      "file": "slides__01-title.png",
      "path": "/absolute/path/to/deck/.starry-slides/view/slides__01-title.png",
      "width": 1920,
      "height": 1080,
      "scale": 1
    }
  ]
}
```

Example verify failure result from `view`:

```json
{
  "deck": "/absolute/path/to/deck",
  "mode": "complete",
  "ok": false,
  "issues": [
    {
      "level": "error",
      "code": "overflow.element-bounds",
      "message": "editable element exceeds slide bounds"
    }
  ]
}
```

## `open`

Use `open` to verify a deck and launch the browser editor.

```bash
starry-slides open <deck>
```

What it does:

- runs full `verify` first
- stops immediately if verification fails
- starts the local editor server after verification succeeds
- opens the editor in a browser
- writes startup messages to stderr
- may print a runtime update notice to stderr before startup

Example successful startup messages:

```text
Opening Starry Slides at http://127.0.0.1:5173/
Press Ctrl+C to stop the editor server.
```

Example failure result:

```json
{
  "deck": "/absolute/path/to/deck",
  "mode": "complete",
  "ok": false,
  "issues": [
    {
      "level": "error",
      "code": "overflow.element-bounds",
      "message": "editable element exceeds slide bounds"
    }
  ]
}
```

## Default Open Form

You can also omit the explicit `open` command:

```bash
starry-slides <deck>
```

This behaves the same as:

```bash
starry-slides open <deck>
```
