# Milestone 3: Agent-Integrated AI Slide Workflow and Productization

Status:

- Planned

Goal:

- Integrate an Agent into the product so users can generate, inspect, modify,
  and persist HTML slides through a complete AI-assisted workflow.
- Productize the app beyond the local editing demo by adding deployment,
  operational boundaries, and user-facing documentation.

Scope:

- Agent integration for slide generation and modification.
- A complete AI workflow from prompt to generated deck to editable HTML slides.
- A complete AI modification workflow from user request to proposed edits,
  review, application, undo/redo, and persisted output.
- Product deployment and documentation required for real usage outside the
  local development loop.

Non-goals inherited from Milestone 2:

- Milestone 3 should not regress the editing-only capabilities already shipped
  in Milestone 2.
- Agent operations must use the existing HTML-first editing model instead of
  introducing a separate proprietary deck format.

#### 3a. Agent Architecture and Trust Boundary

Expected direction:

- Define the Agent runtime boundary and decide whether the first productized
  path runs locally, server-side, or through a hosted job/execution service.
- Define the tool contract between the app, Agent, slide protocol tools, and
  editor operations.
- Treat Agent output as untrusted until validated by the slide protocol and
  imported through `packages/core`.
- Keep the editor's shared operations as the mutation path for accepted edits
  whenever possible, so human edits and AI edits share history semantics.

Implementation topics:

- Agent request/response schema for deck generation and deck modification.
- Tool calls for reading the current deck, reading selected slide/element
  context, proposing changes, validating HTML, and applying accepted edits.
- Error states for invalid output, partial generation, timeout, and model/tool
  failures.
- Audit trail or structured activity log for Agent actions.

#### 3b. AI Slide Generation Workflow

Expected workflow:

1. User provides topic, audience, goals, source material, style direction, and
   slide count constraints.
2. Agent creates or selects a slide plan.
3. Agent generates protocol-compatible HTML slides and a manifest.
4. Protocol validation runs before slides enter the editor.
5. The editor loads the generated deck with stable editable markers,
   thumbnails, and full edit/write-back support.

Implementation topics:

- Product UI for generation inputs and progress.
- Reuse or evolve the unified slide contract in
  [STARRY-SLIDES-CONTRACT.md](../../skills/starry-slides/references/STARRY-SLIDES-CONTRACT.md)
  as the generation foundation.
- Validation and repair loop for Agent-generated HTML.
- Style pack selection or style direction handling.
- Generated deck storage, naming, and refresh behavior.

#### 3c. AI Slide Modification Workflow

Expected workflow:

1. User asks for a change scoped to the selected element, current slide, or
   whole deck.
2. Agent receives structured context from the editor and current deck.
3. Agent proposes copy, style, layout, or structural changes.
4. The app previews the proposed change or shows a structured diff.
5. User accepts, rejects, or asks for revision.
6. Accepted changes are applied through shared operations or a validated HTML
   replacement path, then persist through the same write-back/version path.

Implementation topics:

- Replace the current static chat panel with a live Agent-backed workflow.
- Scope controls for selected element, current slide, and whole deck.
- Proposed edit representation:
  - operation list for text/style/layout changes where possible
  - validated slide HTML replacement only when operations are insufficient
- Preview, accept/reject, undo/redo, and retry behavior.
- Regression tests for AI-applied edits using deterministic fixtures or mocked
  Agent responses.

#### 3d. Versioning, Persistence, and Review

Expected direction:

- Promote the reserved version management layer into a real product concept.
- Preserve clear separation between transient editor state, committed history,
  saved deck state, and Agent-generated proposals.

Implementation topics:

- Deck/project model for multiple generated decks instead of only the shared
  local regression deck.
- Checkpoints or versions before and after Agent actions.
- Recovery behavior for failed saves and invalid Agent edits.
- Export/import boundaries for saved projects.
- Optional collaboration-safe shape if multi-user editing becomes a near-term
  goal.

#### 3e. Deployment and Productization

Expected direction:

- Move from a local Vite middleware demo to a productized deployment shape with
  explicit storage, runtime, and security assumptions.

Implementation topics:

- Choose the first deployment target and runtime model.
- Replace local file write-back assumptions with a deployable persistence
  strategy.
- Configure environment variables, model/provider settings, and storage
  credentials.
- Add health checks, build verification, and deploy documentation.
- Review security boundaries for uploaded sources, generated HTML, embedded
  assets, Agent tool access, and persisted deck data.

#### 3f. Documentation

Expected direction:

- Make the project understandable for both users and contributors.

Documentation topics:

- User guide for generating decks, editing slides, and applying AI changes.
- Contributor guide for packages, skills, protocol tools, and test workflow.
- Agent integration architecture document.
- Deployment guide for the chosen product runtime.
- Troubleshooting guide for validation failures, save failures, and Agent
  errors.

Exit criteria:

- Users can generate a new deck through the product UI, validate it, open it in
  the editor, modify it manually, and persist the result.
- Users can request AI changes to a selected element, current slide, and whole
  deck, then preview and accept/reject those changes.
- Accepted Agent edits share the editor's history/persistence model or have a
  documented validated replacement path.
- The app has a documented deployment path with explicit storage and runtime
  assumptions.
- Agent output validation, error handling, and recovery behavior are covered by
  tests.
- Product and contributor documentation are updated enough for a new user to
  run, deploy, and extend the system.

Recommended first Milestone 3 slice:

1. Define the Agent integration contract.
   - Specify context payloads, proposed edit format, validation behavior, and
     apply/reject semantics.
2. Turn the static chat panel into a mocked Agent workflow.
   - Use deterministic responses first so the editor, diff, apply, undo, and
     persistence behavior can be tested without model variability.
3. Add the first real AI modification path.
   - Start with selected text rewrite because it can map cleanly to existing
     `text.update` operations.
4. Add validated whole-slide replacement only after operation-based edits are
   proven.
   - Whole-slide replacement should go through protocol validation and import
     normalization before it reaches the editor.
5. Decide the product deployment target.
   - This decision should happen early because persistence and Agent runtime
     boundaries depend on it.
