# ADR-0015: Adopt Minimal Mono editor chrome direction

- Status: implemented-reference
- Date: 2026-05-06

## Context

ADR-0003 established Tailwind CSS and shadcn/ui as the implementation strategy
for editor UI chrome. After that foundation landed, the editor still needed a
clear visual direction for how those primitives should compose into product
surfaces.

`DESIGN.md` defines the Minimal Mono design direction:

- monochrome chrome built from `foreground` alpha steps
- quiet borders and shadows
- compact, precise toolbar and inspector controls
- lucide icons with neutral color
- limited motion: fade and color transitions only
- no warm brand color in editor chrome except destructive states and user
  content swatches

The original `docs/minimal-mono-refactor-plan.md` captured the module-by-module
refactor plan for reaching that direction. The refactor is now implemented
enough that the plan should no longer read as an active backlog. Future agents
should treat Minimal Mono as the implemented reference direction for editor
chrome, not as a pending migration.

Generated slide HTML inside the iframe remains out of scope. Slide documents
can keep their own colors, images, typography, and layout.

## Decision

Adopt Minimal Mono as the implemented reference direction for editor chrome.

This ADR is reference material for future editor UI work:

1. New editor chrome should follow `DESIGN.md` and the implemented Minimal Mono
   patterns already present in `src/editor`.
2. Existing Minimal Mono choices should be preserved unless a newer ADR
   supersedes this direction.
3. Colorful UI remains appropriate when it represents user slide content, such
   as color picker swatches, gradients, or generated slide previews.
4. Editor chrome should use neutral foreground alpha, compact controls, subtle
   borders/shadows, and restrained motion.
5. The Floating Toolbar remains the main dense property-editing surface per
   ADR-0009. Do not revive the removed right-side inspector tool panel as part
   of Minimal Mono follow-up work.

This is not a new active migration plan. It records the implemented design
direction so future work has stable reference context.

## Implementation Reference

Minimal Mono is implemented across these editor areas:

- `src/editor/styles/index.css`: neutral theme tokens and editor palette
- `src/editor/components/ui/`: compact shadcn/ui primitive variants
- `src/editor/components/floating-toolbar.tsx`: reference toolbar, panel,
  action-group, and compact property-editing patterns
- `src/editor/components/floating-toolbar-parts.tsx`: neutral panel, divider,
  icon button, and label patterns
- `src/editor/components/editor-header.tsx`: quiet utility header chrome
- `src/editor/components/slide-sidebar.tsx`: neutral active and hover states
- `src/editor/components/stage-canvas.tsx`: neutral stage, selection, and
  toolbar anchoring chrome
- `src/editor/components/color-picker.tsx`: colorful user-content swatches
  inside neutral control chrome
- `src/editor/components/block-manipulation-overlay.tsx`: manipulation chrome
  aligned with the editor visual system
- `src/editor/lib/motion.ts`: restrained motion helpers

Use those modules as the primary implementation reference before inventing new
editor styling conventions.

## Verification

Minimal Mono follow-up work should preserve the existing editor behavior gates:

- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm test:e2e`

For visual changes, also inspect representative states:

- default editor shell
- selected editable element with Floating Toolbar visible
- open Floating Toolbar dropdown
- color picker open from toolbar
- slide sidebar hover/focus state
- manipulation handles and snap guides
- text editing mode with editor chrome suppressed
- narrow viewport around the `1200px` breakpoint

## Consequences

Future editor chrome work has a clear reference direction and should not reopen
basic palette, density, or motion choices without a superseding ADR.

The original refactor plan can be treated as historical context. It is useful
for understanding why modules changed, but it should not be managed as an
active task list.

Generated slide content remains visually independent from editor chrome. This
keeps style-pack and deck design work separate from application UI design.

## Alternatives considered

### Keep `minimal-mono-refactor-plan.md` as the active source

Rejected. The plan was useful while the refactor was pending, but leaving it as
an active plan after implementation makes future agents treat completed work as
unfinished.

### Fold the direction only into `DESIGN.md`

Rejected. `DESIGN.md` describes the design language, but an ADR is the right
place to capture how the repository should treat that direction architecturally
and operationally.

### Treat Minimal Mono as purely cosmetic

Rejected. The direction affects shared editor primitives, motion helpers,
surface density, and future UI composition. Those are codebase conventions, not
only visual preferences.
