# Minimal Mono Refactor Plan

This plan compares the current editor chrome with `DESIGN.md` and defines the
refactor needed to make the project follow the Minimal Mono design system.

This is not a new architecture decision. ADR-0003 already decides that
`src/editor` owns Tailwind, shadcn/ui, and editor UI chrome. This document
is the visual and module-level implementation plan inside that decision.

## Goal

Move all editor chrome toward the Minimal Mono rules in `DESIGN.md`:

- monochrome chrome built from `foreground` alpha steps
- quiet borders and shadows
- compact, precise toolbar and inspector controls
- lucide icons with neutral color
- limited motion: fade and color transitions only
- no warm brand color in editor chrome except destructive states and user
  content swatches

Generated slide HTML inside the iframe is out of scope. The slide document can
keep its own colors, images, typography, and layout.

## Current State

The codebase already matches the technical direction:

- `src/editor` owns editor chrome.
- Tailwind v4 is compiled from `src/editor/styles/index.css`.
- shadcn/ui primitives live in `src/editor/components/ui`.
- editor modules use `cn()` from `src/editor/lib/utils.ts`.
- AI Elements wrappers exist under `src/editor/components/ai-elements`.

The visual system does not yet match `DESIGN.md`. Current chrome still reads as
warm, orange-accented, and more expressive than Minimal Mono.

## Difference Inventory

| Area | Current implementation | Minimal Mono target | Files |
| --- | --- | --- | --- |
| Theme palette | Warm ivory background, orange `primary`, warm `accent`, brown-tinted shadows. | Neutral page background, white surfaces, hierarchy from `foreground` alpha. | `src/editor/styles/index.css` |
| Primary actions | `Button` default uses orange `primary`; active toolbar states use `bg-primary` or `bg-primary/10`. | Toolbar/chrome active states use `bg-foreground/[0.06]` to `[0.08]`; no brand color in chrome. | `src/editor/components/ui/button.tsx`, `src/editor/components/floating-toolbar.tsx` |
| Header | Large 72px header, warm card background, outline icon button plus orange Present button. | Quiet utility header with smaller controls; primary color avoided unless the action truly leaves editor chrome. | `src/editor/components/editor-header.tsx` |
| App shell | 18px gaps, warm page background inherited from theme. | Denser editor layout with neutral canvas/page background. | `src/editor/index.tsx`, `src/editor/styles/index.css` |
| Slide sidebar | Active slide has orange border, rounded 14px thumbnails, gradient placeholder, hover expansion. | Neutral border/foreground alpha active state; gradients only for user content, not chrome placeholders. | `src/editor/components/slide-sidebar.tsx` |
| Stage frame | Rounded 20px card with warm brown shadow. Selection outline and label use orange primary. | Stage surface can remain framed, but border/shadow should be neutral and subtle; selection chrome should not use brand orange. | `src/editor/components/stage-canvas.tsx` |
| Floating toolbar | Rounded 16px container, brown-tinted elevation, 36px controls, active buttons in orange, bold active text. | `rounded-xl`, 32px controls, neutral alpha hover/active, 14px icons, lighter shadow. | `src/editor/components/floating-toolbar.tsx` |
| Toolbar popovers | Rounded 16px, p-3, warm shadow, zoom/slide animation. | `rounded-xl`, `p-1.5`, neutral double shadow, fade-only entrance. | `src/editor/components/floating-toolbar.tsx`, `src/editor/lib/motion.ts` |
| Color picker | Useful control shape, but presets use hover scale, strong primary ring, gradients available. | Swatches should stay visual because they represent user content; chrome around them should be neutral, no hover scale. | `src/editor/components/color-picker.tsx` |
| Block manipulation overlay | Orange handles and snap guides, hover scale. | Neutral manipulation chrome unless a strong selection color is intentionally retained as an editor affordance. If retained, document it as the one exception. | `src/editor/components/block-manipulation-overlay.tsx` |
| Motion | `zoom-in-95`, slide-in classes, hover scale on swatches/handles. | Fade and color transitions only; no scale/zoom/large translate motion. | `src/editor/lib/motion.ts`, toolbar, color picker, manipulation overlay |
| Typography | Some labels use uppercase, but many panel headings are larger/bolder and section descriptions add visual weight. | 13px control text, 10-11px uppercase labels, `tabular-nums` for numeric values, restrained weights. | toolbar, inspector, header, sidebar |

## Refactor Modules

### 1. Theme Token Module

Files:

- `src/editor/styles/index.css`

Problem:

The current theme tokens encode a warm, orange design direction. That makes
every primitive inherit a non-Minimal Mono behavior even when the local classes
are neutral.

Solution:

- Re-map `--background`, `--card`, `--popover`, `--border`, `--input`, and
  `--ring` to neutral values.
- Keep `--destructive` for destructive affordances.
- Decide whether `--primary` remains available only for non-chrome product
  actions, or becomes a neutral alias for editor chrome.
- Prefer `foreground` alpha utilities directly in editor chrome when the design
  calls for exact opacity steps.

Leverage:

One token pass gives every shadcn/ui primitive a neutral default and reduces
surface-by-surface override churn.

### 2. Editor Primitive Variant Module

Files:

- `src/editor/components/ui/button.tsx`
- `src/editor/components/ui/input.tsx`
- `src/editor/components/ui/select.tsx`
- `src/editor/components/ui/tabs.tsx`
- `src/editor/components/ui/popover.tsx`
- `src/editor/components/ui/toggle.tsx`
- `src/editor/components/ui/toggle-group.tsx`

Problem:

The primitives still expose warm default/secondary/accent behavior and generic
shadcn dimensions. Callers compensate with one-off classes, which spreads visual
knowledge across editor modules.

Solution:

- Add or retune editor-friendly variants for chrome controls:
  - compact ghost button
  - compact icon button
  - quiet secondary/active button
  - minimal input/select surface
  - line tabs with neutral active indicator
- Keep the primitive interface small. Avoid creating a separate component for
  every toolbar case; prefer variants that hide repeated class decisions.

Leverage:

Toolbar, inspector, chat, and future editor surfaces can share the same compact
control rules through one interface.

### 3. Floating Toolbar Module

Files:

- `src/editor/components/floating-toolbar.tsx`

Problem:

The toolbar is the most visible mismatch: orange active states, warm elevation,
large rounded controls, heavier typography, and zoom/slide entrance.

Solution:

- Replace active states with `foreground` alpha backgrounds.
- Standardize controls to 32px height and 14px icons.
- Replace brown shadows with the double neutral shadow from `DESIGN.md`.
- Use `Separator` or local divider classes that render `foreground/10`.
- Reduce popover padding and radius.
- Keep color swatch fill as user content, but make its border and selection
  treatment neutral.
- Remove zoom/slide motion from toolbar panel entry.

Leverage:

This module becomes the main reference implementation for Minimal Mono
toolbar, dropdown, label, divider, and active-state patterns.

### 4. Removed Inspector Tool Panel

ADR-0009 removed the right-side Sidebar Tool Panel from the active editor model.
Minimal Mono follow-up work should continue styling the Floating Toolbar and its
dropdown panels instead of reviving the removed inspector surface.

Solution:

- Do not reintroduce the removed right-side inspector surface for Minimal Mono
  polish work.
- Apply dense property editing patterns to Floating Toolbar dropdown panels.
- Keep labels, gaps, inputs, and selects compact in toolbar popovers.

Leverage:

The Floating Toolbar dropdown panels become the reference implementation for
dense property editing and future CSS/layout controls.

### 5. Shell, Sidebar, and Stage Chrome Module

Files:

- `src/editor/index.tsx`
- `src/editor/components/editor-header.tsx`
- `src/editor/components/slide-sidebar.tsx`
- `src/editor/components/stage-canvas.tsx`

Problem:

The surrounding editor shell still sets the first impression: warm background,
large header, orange active thumbnail and selection outline, broad shadows.

Solution:

- Make the page/canvas background neutral.
- Reduce header visual weight and button emphasis.
- Replace sidebar active slide orange border with neutral alpha treatment.
- Replace thumbnail loading gradient with neutral surface.
- Tune stage frame radius/shadow down.
- Decide whether selection outlines are chrome or editing affordance:
  - default recommendation: neutral `foreground` alpha with enough contrast
  - alternative: keep one explicit selection color and document it as an
    exception to Minimal Mono

Leverage:

This pass aligns the whole editor frame before deeper inspector or chat polish,
so later module work does not fight the shell.

### 6. Color Picker and Manipulation Affordance Module

Files:

- `src/editor/components/color-picker.tsx`
- `src/editor/components/block-manipulation-overlay.tsx`

Problem:

These modules mix user-content color with editor chrome color. The swatches and
spectrum must stay colorful, but the control frames, rings, handles, and motion
should follow Minimal Mono.

Solution:

- Keep swatch/spectrum/gradient colors because they represent document content.
- Replace primary selection rings with neutral rings where possible.
- Remove hover scale from swatches and manipulation handles.
- Use neutral shadows and borders.
- If manipulation handles need a high-contrast accent for usability, define a
  single editor-selection token instead of reusing warm `primary`.

Leverage:

This keeps the important distinction clear: color in slide content is allowed;
color in editor chrome is not.

### 7. Motion Module

Files:

- `src/editor/lib/motion.ts`
- modules that append slide/zoom/scale classes

Problem:

Motion helpers currently include zoom-in/out and some call sites add slide-in
classes. Some controls use hover scale.

Solution:

- Change panel enter/exit helpers to fade-only.
- Remove call-site slide-in classes unless they are needed for spatial
  orientation and explicitly documented.
- Replace hover scale with color, border, outline, or shadow changes.

Leverage:

One motion rule keeps future editor chrome from drifting back into expressive
interaction patterns.

## Suggested Implementation Order

1. Theme tokens: neutralize global editor palette and ring/border defaults.
2. Primitive variants: make `Button`, `Input`, `Select`, `Tabs`, and `Popover`
   capable of Minimal Mono without long caller class strings.
3. Floating toolbar: establish the reference implementation for the design
   system.
4. Shell/sidebar/stage: remove the warm first impression and orange selection
   chrome.
5. Inspector panel: compact property editing around the new primitives.
6. Color picker/manipulation overlay: separate user-content color from chrome.
7. Motion cleanup: remove remaining zoom/slide/scale motion.

This order keeps high-leverage tokens and primitives early, then applies them to
visible surfaces.

## Testing and Verification

Most changes are visual and do not need new unit tests unless behavior changes.
Still run the repository verification command before closing the refactor:

```bash
pnpm verify
```

Visual verification should include:

- desktop screenshot at the default dev viewport
- a selected editable element showing the floating toolbar
- an open toolbar dropdown
- inspector edit tab with open sections
- chat tab
- slide sidebar hover/focus state
- color picker open from toolbar
- mobile or narrow viewport around the `1200px` breakpoint

Functional regression checks:

- selecting slides still updates active slide
- selecting an editable element still shows overlay and toolbar
- text style edits still commit through core operations
- undo/redo still works for committed edits
- inspector open/close still preserves layout

## Open Decisions

1. Should selection outlines and manipulation handles be neutral, or should the
   editor keep one non-content selection accent for usability?
2. Should the `Present` button remain visually primary, or should it become a
   quiet ghost/outline command because it is part of editor chrome?
3. Should inspector section descriptions remain, or should they be removed to
   make the tool panel denser and more Minimal Mono?
4. Should `--primary` be redefined as neutral for this package, or preserved as
   a semantic token that only non-chrome surfaces may use?
