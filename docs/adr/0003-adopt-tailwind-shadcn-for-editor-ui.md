# ADR-0003: Adopt Tailwind and shadcn/ui for editor UI

- Status: accepted
- Date: 2026-05-03

## Context

The editor UI is currently implemented with package-local React components and
handwritten CSS under `packages/editor/src/styles/`. Most visible editor chrome
uses `hse-*` class names and custom CSS files:

- shell and header styles in `shell.css`
- slide sidebar styles in `sidebar.css`
- stage, floating toolbar, color picker, and overlay styles in `stage.css`
- inspector and chat styles in `inspector.css`
- responsive behavior in `responsive.css`

This worked while the editor was a small custom UI. The product direction has
changed: the right inspector is becoming an AI-native chat surface, and the team
wants to use AI Elements. AI Elements is a component registry built on top of
shadcn/ui, and shadcn/ui expects a Tailwind-based component and theme setup.

Current repository facts:

- `apps/web` is a Vite + React app.
- `packages/editor` is the reusable React editor package.
- `packages/editor` owns the interactive editor UI per ADR-0002.
- There is no `components.json`, Tailwind config, Tailwind CSS entrypoint, or
  shadcn/ui component directory today.
- `packages/editor` currently exports `./styles.css`, and `apps/web` imports
  `@starry-slide/editor/styles.css`.

The new decision must avoid a half-migrated state where some editor surfaces are
custom CSS while others are shadcn/Tailwind. That mixed model would make later
AI Elements work harder, duplicate design tokens, and keep visual behavior
split across incompatible styling systems.

## Decision

Adopt Tailwind CSS and shadcn/ui as the single UI implementation strategy for
all `packages/editor` user-interface chrome.

The target state is:

1. `packages/editor` owns its shadcn/ui component source, Tailwind theme entry,
   and editor-specific composition components.
2. All editor chrome is implemented with Tailwind utility classes and shadcn/ui
   primitives/composition patterns.
3. AI chat surfaces use AI Elements registry components once the shadcn/Tailwind
   foundation is in place.
4. Existing handwritten `hse-*` CSS is removed from editor UI as migration work
   completes.
5. `apps/web` continues to compose and load the editor, but does not own editor
   UI components or editor design-system implementation.

### Scope

This decision applies to user-visible editor chrome in `packages/editor`,
including:

- app shell and header
- slide sidebar and thumbnails
- stage frame and editor controls around the iframe
- selection overlays and block manipulation handles
- floating toolbar
- color picker
- inspector/edit panel
- chat panel and future AI Elements surfaces
- responsive layout for the editor

This decision does not apply to generated slide content inside the iframe. Slide
HTML and style packs remain authored as slide documents, not editor chrome.

### Styling rules

After migration, editor UI code must follow these rules:

- Use shadcn/ui source components before custom markup for available primitives:
  `Button`, `Tabs`, `Accordion`, `Select`, `Input`, `Textarea`, `ToggleGroup`,
  `Tooltip`, `Popover`, `ScrollArea`, `Separator`, `Card` only where a framed
  repeated item or modal-like region is actually appropriate.
- Use AI Elements components for chat-specific primitives:
  `Conversation`, `Message`, `PromptInput`, `Suggestion`, and later reasoning,
  tool, confirmation, source, attachment, and artifact components as needed.
- Use Tailwind utility classes and semantic theme tokens for layout and styling.
- Use `cn()` for conditional class composition.
- Do not introduce new component-level `.hse-*` CSS selectors.
- Do not add new handwritten CSS files for editor components.
- Inline `style` is allowed only for dynamic geometry that cannot be expressed
  statically, such as selection overlay position, dimensions, transform origin,
  iframe scale, or color-picker spectrum coordinates.
- CSS custom properties may exist only as Tailwind/shadcn theme tokens or
  low-level dynamic geometry variables, not as a parallel design system.
- During migration, legacy `hse-*` classes may remain only in files not yet
  migrated. New or touched UI surfaces should move toward the target system.

### Package ownership

The editor package should own the editor design system rather than importing UI
components from `apps/web`.

Planned package-local layout:

```text
packages/editor/
  components.json
  src/
    components/
      ui/                  # shadcn/ui generated source components
      ai-elements/          # AI Elements registry components
      editor/               # editor-specific composed surfaces
    lib/
      utils.ts              # cn()
    styles/
      index.css             # Tailwind v4 entrypoint and shadcn theme tokens
```

`apps/web` should keep importing the editor as a package. It may import the
editor CSS artifact as it does today, but it should not contain editor-specific
shadcn components.

### Build direction

`packages/editor` must produce a compiled CSS artifact that includes the
Tailwind utilities used by editor package source files and any package-local
shadcn/AI Elements components.

The implementation plan should evaluate the exact build mechanism before code
migration, but the intended result is:

- `packages/editor` build emits `dist/index.js`, `dist/index.d.ts`, and
  `dist/index.css`.
- `apps/web` can continue importing
  `@starry-slide/editor/styles.css`.
- Tailwind scanning includes `packages/editor/src/**/*.{ts,tsx}`.
- The editor package does not rely on `apps/web` to scan editor source classes
  for production CSS.

This likely means adding Tailwind v4 and a CSS build/watch step to
`packages/editor`, rather than relying only on the Vite app plugin.

## Consequences

Benefits:

- Editor UI gets one styling model instead of a custom CSS/shadcn hybrid.
- AI Elements can be adopted as intended because its shadcn/ui and Tailwind
  assumptions are satisfied.
- Future agents can reason about UI implementation through source components and
  Tailwind classes instead of chasing global CSS selectors.
- Design tokens become explicit and reusable through the shadcn/Tailwind theme.
- The package boundary from ADR-0002 remains intact: editor UI stays in
  `packages/editor`, while `apps/web` remains app composition.

Costs:

- This is a large UI migration touching most files under `packages/editor/src`.
- The editor package build pipeline becomes more complex because it must compile
  Tailwind CSS as part of library output.
- Existing E2E tests that target `hse-*` classes may need to move to stable
  `data-testid`, ARIA roles, or user-visible labels.
- Some custom editor controls, especially the floating toolbar, color picker,
  stage overlay, and manipulation handles, will need careful shadcn/Tailwind
  composition rather than direct one-to-one replacement.

Risks:

- A partial migration could leave two design systems in place. The migration
  plan must keep transitional scope explicit and remove legacy CSS by phase.
- Tailwind class scanning can miss package-local source files if the build
  pipeline is configured only for `apps/web`.
- shadcn components generated into the wrong workspace would create import
  direction problems. Components must live with the editor UI they serve.

## Alternatives considered

### Keep the current custom CSS and hand-build chat UI

Rejected. This keeps short-term changes small, but it means AI Elements cannot
be used as intended. It also leaves the project with custom implementations of
components that shadcn/AI Elements already provide.

### Add shadcn/ui only to `apps/web`

Rejected. `packages/editor` owns editor UI under ADR-0002. If shadcn components
live only in `apps/web`, the reusable editor package either cannot use them or
must depend on the app, which reverses the package boundary.

### Create a new shared `packages/ui`

Deferred. A shared UI package may make sense if multiple apps or packages need
the same non-editor components. Today, the requirement is specifically to unify
`packages/editor` UI, and a new package would add indirection before there is a
second consumer. This can be revisited if another app needs the same primitives.

### Use Tailwind utilities without shadcn/ui

Rejected. Tailwind alone would solve styling mechanics but not component
composition, accessibility defaults, AI Elements compatibility, or the desired
shadcn/ui component workflow.

## Non-goals

This ADR does not:

- implement the migration
- choose the final visual theme, palette, or exact shadcn preset
- define the future Codex/Claude agent protocol
- change core editing operations, history, or HTML write-back semantics
- require generated slide HTML inside the iframe to use Tailwind or shadcn/ui
- require every internal geometric overlay value to avoid inline style

## Implementation Plan

Implementation must happen in explicit phases. Do not rewrite the whole editor
in one unreviewable patch.

### Phase 1: Bootstrap Tailwind and shadcn for `packages/editor`

- Add Tailwind v4 dependencies and a package-local Tailwind CSS entrypoint.
- Add shadcn/ui configuration for the editor package.
- Add `cn()` in `packages/editor/src/lib/utils.ts`.
- Generate only the shadcn primitives required by the first migration slice.
- Configure the editor package build so `dist/index.css` contains compiled
  Tailwind output for editor source files.
- Preserve `@starry-slide/editor/styles.css` as the CSS import path unless
  a later ADR changes package exports.

Expected first shadcn components:

- `button`
- `tabs`
- `scroll-area`
- `separator`
- `tooltip`
- `popover`
- `input`
- `textarea`
- `select`
- `accordion`
- `toggle-group`
- `field`
- `card` only if a migrated surface has a real framed item/modal need

### Phase 2: Establish editor design tokens

- Map current editor colors, radii, spacing, typography, focus rings, and
  shadows into Tailwind/shadcn theme tokens.
- Remove duplicated visual constants from component CSS as surfaces migrate.
- Keep editor UI restrained and tool-like: dense enough for repeated editing,
  no marketing layout patterns, no nested decorative cards.

### Phase 3: Migrate shell, header, sidebar, and inspector frame

- Replace `shell.css`, `sidebar.css`, `inspector.css`, and related `hse-*`
  shell classes with Tailwind/shadcn composition.
- Keep stable test selectors where E2E tests need structural hooks.
- Prefer ARIA roles and accessible labels for tabs, buttons, lists, and panels.

### Phase 4: Migrate chat to AI Elements

- Add AI Elements registry components into `packages/editor/src/components/ai-elements`.
- Replace the temporary local chat panel with AI Elements primitives.
- Keep functionality scoped to UI interaction until the agent protocol is
  decided separately.
- Model inline forms as chat message content that can generate prompt drafts,
  without coupling the UI to a specific local agent yet.

Expected AI Elements components:

- `conversation`
- `message`
- `prompt-input`
- `suggestion`
- `confirmation` or equivalent form/approval component if needed
- later: `reasoning`, `tool`, `sources`, `attachments`, `artifact`

### Phase 5: Migrate floating toolbar, color picker, and stage chrome

- Compose toolbar controls from shadcn `Button`, `ToggleGroup`, `Select`,
  `Popover`, `Tooltip`, and related primitives.
- Keep custom geometry logic in React/state hooks, but express visual styling
  with Tailwind utilities.
- Replace custom color picker styling with shadcn-compatible composition where
  possible; keep custom pointer math only where necessary.

### Phase 6: Remove legacy CSS

- Delete migrated CSS files and remove `hse-*` selectors from editor UI.
- Keep only Tailwind entry CSS, theme tokens, and any documented low-level CSS
  that Tailwind cannot represent safely.
- Update tests that relied on class selectors.
- Update package and context documentation to describe the new UI convention.

## Verification

- [ ] `packages/editor` contains a `components.json` or equivalent shadcn config
      scoped to the editor package.
- [ ] `packages/editor` builds a compiled `dist/index.css` that includes
      Tailwind output for editor source files.
- [ ] `apps/web` can render the editor by importing
      `@starry-slide/editor` and `@starry-slide/editor/styles.css`.
- [ ] New editor UI code uses Tailwind classes and shadcn/ui primitives instead
      of new handwritten component CSS.
- [ ] No new `hse-*` selectors are introduced after Phase 1.
- [ ] Existing `hse-*` selectors decrease by migration phase and are removed
      from user-facing editor chrome by Phase 6.
- [ ] Chat UI uses AI Elements components after Phase 4.
- [ ] E2E tests use roles, labels, and `data-testid` rather than styling class
      names for migrated surfaces.
- [ ] `pnpm lint`, `pnpm test`, `pnpm build`, and relevant Playwright E2E tests
      pass after each migration phase.
- [ ] Desktop and narrow responsive editor layouts are visually checked after
      each migrated surface.

## References

- shadcn/ui Vite installation documents Tailwind setup, `components.json`, and
  monorepo workspace targeting with `-c apps/web`:
  <https://ui.shadcn.com/docs/installation/vite>
- AI Elements describes itself as a shadcn/ui-based registry for AI-native
  applications and documents chat components such as Conversation, Message,
  Prompt Input, and Suggestion:
  <https://elements.ai-sdk.dev/>
