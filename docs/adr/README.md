# ADR Index

This directory records architecture decisions for the editor.

## When to update ADRs

Update this directory whenever a change affects:

- editor interaction architecture
- HTML write-back or persistence
- history, undo/redo, or versioning
- collaboration model
- package boundaries or major module responsibilities

## Workflow

1. Read relevant ADRs before making a new architectural proposal.
2. Add a new ADR for new decisions.
3. Mark older ADRs as superseded when needed.
4. Keep this index in sync with the files in this directory.

## Status legend

- `accepted`: current decision
- `superseded`: replaced by a newer ADR
- `proposed`: drafted but not yet adopted
- `implemented-reference`: implemented direction retained as reference context

## ADRs

| ADR                                                                             | Title                                                                           | Status                |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------- |
| [0001](./0001-editing-pipeline-and-versioning.md)                               | Editing pipeline and versioning strategy                                        | accepted              |
| [0002](./0002-package-boundaries-for-core-editor-and-app.md)                    | Package boundaries for core, editor, and app                                    | superseded            |
| [0003](./0003-adopt-tailwind-shadcn-for-editor-ui.md)                           | Adopt Tailwind and shadcn/ui for editor UI                                      | accepted              |
| [0004](./0004-deepen-core-document-modules.md)                                  | Deepen core by splitting document, history, geometry, and import modules        | superseded            |
| [0005](./0005-adopt-two-subject-skill-and-editor-architecture.md)               | Adopt two-subject architecture for Starry Slides Skill and Editor               | superseded            |
| [0006](./0006-unify-element-tooling-into-shared-toolbar-model.md)               | Unify element tooling into a shared toolbar model                               | superseded            |
| [0007](./0007-limit-generated-deck-copies.md)                                   | Limit generated deck copies                                                     | accepted              |
| [0008](./0008-adopt-starrykit-slides-single-package.md)                         | Adopt @starrykit/slides as the single product package                           | accepted              |
| [0009](./0009-use-floating-toolbar-as-the-only-element-tooling-surface.md)      | Use Floating Toolbar as the only element tooling surface                        | accepted              |
| [0010](./0010-represent-groups-as-nested-dom-containers.md)                     | Represent groups as nested DOM containers                                       | accepted              |
| [0011](./0011-adopt-starry-slides-agent-facing-cli.md)                          | Adopt starry-slides as the agent-facing CLI                                     | accepted              |
| [0012](./0012-keep-sample-slides-out-of-project-git.md)                         | Keep sample slides out of project Git                                           | accepted              |
| [0013](./0013-adopt-editing-e2e-coverage-contract.md)                           | Adopt editing E2E coverage contract                                             | proposed              |
| [0014](./0014-adopt-cli-and-core-verification-test-contract.md)                 | Adopt CLI and core verification test contract                                   | proposed              |
| [0015](./0015-adopt-minimal-mono-editor-chrome-direction.md)                    | Adopt Minimal Mono editor chrome direction                                      | implemented-reference |
| [0016](./0016-adopt-pdf-export-pipeline-through-core-runtime-cli-and-editor.md) | Adopt a PDF export pipeline through core, runtime, CLI, and editor entry points | accepted              |
| [0017](./0017-adopt-deck-level-slide-operations-for-thumbnail-sidebar.md)       | Adopt deck-level slide operations for the thumbnail sidebar                     | proposed              |
| [0018](./0018-adopt-pointer-depth-selection-and-hover-preselection.md)          | Adopt pointer-depth selection and hover preselection                            | accepted              |
| [0019](./0019-adopt-progressive-pdf-export-dialog.md)                           | Adopt a progressive PDF export dialog in the editor                             | accepted              |
