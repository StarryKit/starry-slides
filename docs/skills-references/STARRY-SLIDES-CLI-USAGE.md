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
- `starry-slides export html [deck] --out <file>`
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

## `export html`

使用 `export html` 将 deck 导出成一个单页 presenter HTML 文件：

```bash
starry-slides export html <deck> --out ./deck.html
```

它会把 manifest 中参与展示的 slide 写入同一个 HTML 文件，并内联 deck-local
资源：

- 本地 `<link rel="stylesheet">` 会转换为内联 `<style>`
- CSS 中的本地 `url(...)` 会转换为 `data:` URL
- 本地图片、音频、视频、`poster`、`source` 等媒体资源会转换为 `data:` URL
- `http:`, `https:`, `data:`, `blob:` 等外部或已内联资源保持不变

导出的 HTML 可以脱离原 deck 目录和本地 dev server 直接打开。命令会把 JSON
结果写到 stdout。

导出的 HTML 还会包含内嵌的 Starry Slides 文档式 icon metadata，包括
favicon、apple touch icon、Open Graph image 和 theme color。在 macOS 上通过
CLI 写入本地文件时，runtime 会 best-effort 写入 Finder custom icon；如果系统
命令不可用或写入失败，HTML 导出仍会成功。

Example result:

```json
{
  "deck": "/absolute/path/to/deck",
  "mode": "all",
  "outFile": "/absolute/path/to/deck.html",
  "path": "/absolute/path/to/deck.html",
  "slides": [
    {
      "index": 0,
      "slideFile": "slides/01-title.html",
      "title": "Title"
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
