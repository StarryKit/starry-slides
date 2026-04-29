<div align="center">

# HTML Slides Editor

**The Best Editor for AI Agent Generated Slides.**

<p>
  <a href="./idea.en.md">Project Idea</a>
  ·
  <a href="./idea.zh.md">项目方案（中文）</a>
</p>

</div>

## Overview

HTML Slides Editor is a project built around a simple belief: if modern presentation tools increasingly render slides as HTML, then HTML itself should be a first-class format for creation and editing.

The project is centered on a two-part workflow:

- generate structured HTML slides with explicit editable markers
- edit those slides visually without converting them into a proprietary document model

This repository stays intentionally high-level. The detailed direction, architecture, and implementation thinking live in the idea documents.

## Why It Exists

There is no strong open source answer today for directly editing arbitrary AI-generated HTML slides in a WYSIWYG workflow.

Most existing slide editors fall into one of two camps:

- they produce polished output, but lock editing into a private internal format
- they stay close to the web platform, but do not provide a serious visual editing model

HTML Slides Editor is aimed at that gap.

## Core Idea

The working model is straightforward:

- AI generates slide HTML with `data-editable` markers
- an editor renders the original HTML inside an `iframe`
- a `Konva` interaction layer sits above it for selection, drag, resize, and editing controls
- changes are written back to the HTML instead of being trapped in a separate opaque format

This keeps the source portable, inspectable, and naturally aligned with the web platform.

## Documentation

- English idea doc: [idea.en.md](./idea.en.md)
- Chinese idea doc: [idea.zh.md](./idea.zh.md)

## Project Status

The project is currently in the idea stage. The current focus is on refining product direction, editing primitives, and implementation strategy.

## Design Principles

- HTML stays the source of truth
- editing should be visual, but not format-locking
- output should remain portable and inspectable
- the system should work well with AI generation, not against it

## Roadmap Direction

The current direction includes:

- a generation-side skill for structured HTML slides
- a browser-based editor built around `iframe` + `Konva`
- a data model that can support selection, movement, text editing, history, and export

The full breakdown lives in the idea docs rather than being duplicated here.

## Contributing

The best place to understand the project before contributing is the idea doc:

- start with [idea.en.md](./idea.en.md) for the English version
- use [idea.zh.md](./idea.zh.md) if you prefer Chinese

As the repository matures, contribution guidelines and implementation-specific docs can be added separately.

## License

This project is licensed under [AGPL-3.0-only](./LICENSE).
