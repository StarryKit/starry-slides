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

## ADRs

| ADR | Title | Status |
| --- | --- | --- |
| [0001](./0001-editing-pipeline-and-versioning.md) | Editing pipeline and versioning strategy | accepted |
| [0002](./0002-package-boundaries-for-core-editor-and-app.md) | Package boundaries for core, editor, and app | accepted |
| [0003](./0003-adopt-tailwind-shadcn-for-editor-ui.md) | Adopt Tailwind and shadcn/ui for editor UI | accepted |
| [0004](./0004-deepen-core-document-modules.md) | Deepen core by splitting document, history, geometry, and import modules | accepted |
| [0006](./0006-unify-element-tooling-into-shared-toolbar-model.md) | Unify element tooling into a shared toolbar model | accepted |
