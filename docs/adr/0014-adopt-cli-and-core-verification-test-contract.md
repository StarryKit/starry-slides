# ADR-0014: Adopt CLI and core verification test contract

- Status: proposed
- Date: 2026-05-06

## Context

ADR-0011 makes `starry-slides` an agent-facing CLI with machine-readable
stdout, meaningful exit codes, rendered preview side effects, and complete
verification before opening the editor. Manual testing has exposed that the
current automated coverage does not fully prove those contracts.

The current CLI tests live in `src/cli/index.test.ts`. They spawn
`pnpm exec tsx src/cli/index.ts`, which is useful integration coverage, but it
does not prove the packaged `starry-slides` binary, the built `dist/cli` entry,
or package-script invocation behavior. Existing Playwright E2E tests cover the
browser editor, not CLI command behavior.

The CLI also depends on lower-level core verification behavior in
`src/core/verify-deck.ts` and runtime rendering behavior in
`src/node/view-renderer.ts`. The test plan must preserve that boundary:
core tests should prove deck contract and verify result semantics without
spawning processes, while CLI tests should prove process-level behavior,
stdout/stderr contracts, exit codes, and filesystem side effects.

## Decision

Adopt a two-layer CLI and core verification test contract:

1. **Core verification tests** cover pure deck contract semantics and structured
   verify result construction without invoking the CLI.
2. **CLI command tests** cover real command behavior by spawning the CLI through
   the same command shapes agents and package consumers use.

CLI tests do not need Playwright as their test runner. They may use Vitest plus
Node child-process APIs because the subject under test is a process interface,
not browser UI. Playwright may still be used indirectly by the CLI runtime when
Complete Verify or `view` launches Chromium for rendered layout checks.

The editor Playwright suite remains focused on browser editor behavior. CLI
tests should be separate from editor E2E so command failures are diagnosable
without starting the editor test server.

### Command coverage matrix

Every documented command shape from ADR-0011 must have command-level coverage.
For each command shape, tests must cover the happy path, the most important
failure path, stdout/stderr behavior, and filesystem or process side effects.

| Command shape | Required expected behavior coverage |
| --- | --- |
| `starry-slides` | Resolves the default deck path and behaves like `starry-slides open` with no explicit deck argument. Tests may stub editor startup, but must prove Complete Verify runs first. |
| `starry-slides [deck]` | Treats the first non-command argument as the deck path and behaves like `starry-slides open [deck]`. Extra positional arguments fail non-zero. |
| `starry-slides open [deck]` | Runs Complete Verify before starting Vite. On verify failure, writes a Verify Result JSON to stdout, exits non-zero, and does not spawn Vite. On verify success, starts the editor server with `STARRY_SLIDES_DECK_DIR` set to the resolved deck path, writes human-readable startup information to stderr, and does not write agent JSON to stdout. |
| `starry-slides verify [deck]` | Runs Complete Verify, writes a Verify Result JSON to stdout, exits `0` when `ok: true`, exits `1` when `ok: false`, includes rendered overflow checks, and reports structural/static/rendered issues in one `issues` array. |
| `starry-slides verify [deck] --static` | Runs Static Verify only, writes a Verify Result JSON to stdout, exits according to `ok`, and excludes rendered overflow checks. Option order before or after `[deck]` should be covered if the parser supports it. |
| `starry-slides view [deck] --slide <manifest-file>` | Runs Static Verify first, requires an exact manifest `file` value, renders exactly one PNG, writes a Preview Manifest JSON to stdout, and writes diagnostics only to stderr. |
| `starry-slides view [deck] --all` | Runs Static Verify first, renders every manifest slide, writes one Preview Manifest JSON to stdout, and produces one PNG per manifest slide. |
| `starry-slides view [deck] --all --out-dir <directory>` | Overrides the default output directory, clears stale files in that directory, writes all previews there, and does not write to `<deck>/.starry-slides/view/`. |
| `starry-slides view [deck] --slide <manifest-file> --out-dir <directory>` | Combines exact single-slide selection with explicit output directory behavior. |
| `starry-slides add-skill` | Preserves the current reserved/stub behavior until a later ADR defines installation semantics. The current expected exit code and stderr text must be asserted so accidental behavior changes are visible. |
| `starry-slides help`, `starry-slides --help`, `starry-slides -h` | Print usage text to stdout and exit `0`; usage must list every supported command shape and option. |

Invalid command and option behavior must also be covered:

- unknown options fail non-zero and write a human-readable error to stderr
- missing option values for `--slide` and `--out-dir` fail non-zero
- `view` without `--slide` or `--all` fails non-zero
- `view --static` fails non-zero because `view` always runs Static Verify
  internally
- conflicting `view --slide ... --all` behavior is explicitly tested and
  documented according to the parser's chosen semantics
- missing deck, invalid manifest, missing slide, and rendered overflow failures
  are represented as structured JSON when the command's contract is JSON stdout

### Test layers

#### Core verification unit/integration tests

Core tests belong near `src/core/verify-deck.test.ts` or equivalent files under
`src/core/`.

They must cover:

- missing deck path returns `structure.missing-deck`
- missing `manifest.json` returns `structure.missing-manifest`
- invalid JSON manifest returns `structure.invalid-manifest`
- empty manifest returns `structure.empty-manifest`
- missing slide file returns `structure.missing-slide`
- manifest slide path escaping the deck returns `structure.slide-escape`
- missing slide root returns `structure.missing-root`
- multiple slide roots returns `structure.multiple-roots`
- invalid `data-editable` values return `structure.invalid-editable`
- invalid `data-group="true"` usage returns `structure.invalid-group`
- missing slide dimensions produce warnings, not errors
- static overflow checks catch explicit `overflow: auto` or `overflow: scroll`
  when not allowed
- `data-allow-overflow="true"` on an element or ancestor exempts static
  overflow issues
- `verifyDeck(..., { mode: "static" })` reports `mode: "static"` and checks
  `["structure", "static-overflow"]`
- `verifyDeck(..., { mode: "complete", renderedIssues })` merges structural,
  static, and rendered issues in one `issues` array
- `summary.errorCount`, `summary.warningCount`, and `ok` are derived only from
  issue severity

Core tests should use temporary deck directories and direct function calls. They
should not spawn `starry-slides`, run Vite, open a browser, or assert process
stdout.

#### Runtime rendering tests

Runtime rendering tests belong near `src/node/view-renderer.test.ts` if they
need to exercise preview rendering or rendered overflow behavior directly.

They must cover:

- `getManifestSlides` returns manifest-ordered slides that exist on disk
- preview filenames are stable and collision-resistant for same basenames in
  different directories
- `renderPreviewManifest` writes PNG files and returns absolute `path` values
- default output directory is `<deck>/.starry-slides/view`
- explicit `outDir` overrides the default output directory
- each view run clears stale files in the chosen output directory
- rendered overflow emits `overflow.slide`, `overflow.element-content`, and
  `overflow.element-bounds` with slide file and selector details
- `data-allow-overflow="true"` exempts rendered overflow issues
- decorative effects such as shadows or blur are not treated as overflow

Runtime rendering tests may launch Chromium because rendered checks depend on
browser layout. They should still avoid starting the editor server unless the
specific behavior requires it.

#### Source CLI integration tests

Source CLI integration tests may remain in `src/cli/index.test.ts`. They cover
fast iteration against `tsx src/cli/index.ts`.

They must cover:

- `verify [deck]` defaults to Complete Verify
- `verify` with no deck uses the default deck resolution path
- `verify [deck] --static` skips rendered checks
- successful verify exits `0` and writes parseable JSON to stdout
- failed verify exits `1` and writes parseable JSON to stdout
- human-readable diagnostics and errors go to stderr
- `view [deck] --slide <manifest-file>` renders exactly one slide
- `view [deck] --all` renders every manifest slide
- `view --out-dir <directory>` writes only to the explicit output directory
- `view` clears stale preview files before writing new previews
- `view` refuses non-exact `--slide` values such as indexes, titles, or slugs
- `view` runs Static Verify before rendering and writes no previews when Static
  Verify fails
- `view --static` fails because view always runs Static Verify internally
- `view` missing `--slide` or `--all` fails
- missing values for `--slide` and `--out-dir` fail
- `view --slide ... --all` follows the documented parser behavior
- `open [deck]` runs Complete Verify before starting the editor
- `open [deck]` does not spawn Vite when Complete Verify fails
- `open [deck]` starts Vite with the resolved deck path when Complete Verify
  succeeds, using a stubbed spawn/open-browser seam or a short-lived child
  process that is always cleaned up
- default `starry-slides [deck]` behaves like `starry-slides open [deck]`
- unknown options fail non-zero
- `help`, `--help`, and `-h` print usage text and exit `0`
- reserved commands such as `add-skill` keep their explicitly documented
  current behavior until a later ADR defines implementation semantics

Source CLI tests may stub process-spawning seams when verifying successful
`open` behavior. They must not make the test suite leave Vite processes running.

#### Packaged CLI contract tests

Add a separate packaged CLI test file, for example
`src/cli/packaged-cli.test.ts` or `tests/cli/packaged-cli.test.ts`.

These tests must run after the CLI is built and must invoke the built package
entry, not `tsx src/cli/index.ts`. Acceptable invocation forms are:

- `node dist/cli/index.js ...`
- `pnpm --silent starry-slides ...` after build, if the package script is kept
  as a supported local invocation
- a temporary package install/link that exposes the `starry-slides` bin, if
  release packaging needs stronger coverage

They must cover:

- the built CLI starts without TypeScript runtime support
- `node dist/cli/index.js verify <fixture>` writes parseable JSON stdout
- `node dist/cli/index.js view <fixture> --slide <file> --out-dir <dir>` writes
  preview PNG files and a parseable Preview Manifest
- `node dist/cli/index.js verify <broken-fixture>` exits `1`
- `node dist/cli/index.js help` prints usage text
- `node dist/cli/index.js add-skill` preserves the documented reserved/stub
  behavior
- packaged default command behavior is covered through either
  `node dist/cli/index.js <fixture>` with stubbed editor startup or an
  implementation seam that proves it delegates to `open`
- no dependency on `tsx` exists in the packaged command path
- stdout remains JSON-only for agent-facing commands
- stderr may contain human-readable errors but never contains JSON that agents
  must parse

Packaged CLI tests are part of the release gate. They may be slower than source
CLI tests but should stay much smaller than browser editor E2E.

### Fixture strategy

CLI and core tests should create deterministic temporary deck fixtures. Do not
rely on `sample-slides/` as the only fixture because ADR-0012 keeps sample
slides out of project Git.

Use shared fixture helpers for:

- a minimal valid deck
- a multi-slide valid deck
- a deck with missing manifest
- a deck with invalid manifest JSON
- a deck with missing slide root
- a deck with static overflow
- a deck with rendered bounds overflow
- a deck with rendered content overflow
- a deck with allowed overflow
- a deck with same-basename slides in different directories

Fixtures should be generated under ignored temporary directories and removed
after each test. Tests must not mutate checked-in slides.

### Output contract assertions

Every CLI command test must assert:

- exit code
- stdout parseability or exact expected text for help
- stderr content or absence
- JSON shape for agent-facing commands
- filesystem side effects when previews or editor startup decisions are
  involved

For JSON stdout, tests must parse stdout with `JSON.parse` and assert key
fields. String containment alone is insufficient for agent-facing output.

### Relationship to package scripts

Package scripts may be convenient for local development, but tests must
distinguish script-runner behavior from CLI behavior.

If documentation recommends `pnpm --silent starry-slides ...` for JSON-parsed
agent workflows, at least one test should prove the documented invocation keeps
stdout parseable. Tests should also document, but do not need to support, the
fact that non-silent package scripts may emit package-manager banners outside
the CLI's control.

## Consequences

The CLI gets its own test contract instead of borrowing confidence from editor
E2E. This makes failures more local: core contract failures point to
`src/core`, process contract failures point to `src/cli`, and browser editing
failures stay in Playwright.

Adding packaged CLI tests introduces a build-before-test dependency for part of
the suite. That cost is acceptable because ADR-0011's agent-facing contract
depends on the published command, not only on source execution through `tsx`.

The test matrix becomes broader, but it avoids using Playwright where process
tests are enough. Browser automation remains reserved for rendered layout and
editor interaction.

## Alternatives considered

### Keep all CLI coverage in `src/cli/index.test.ts`

Rejected. Source CLI tests are useful, but they do not prove the built binary,
the package `bin` entry, or documented command invocation. They also risk
mixing low-level verifier semantics with process behavior in one large file.

### Move CLI command tests into Playwright E2E

Rejected. CLI behavior is a process contract. Starting the editor E2E server to
test stdout, exit codes, and preview files would make failures slower and less
clear. Playwright should remain focused on browser UI behavior, with Chromium
used by runtime code only when rendered layout is the subject.

### Test only through the packaged CLI

Rejected. Packaged CLI tests are necessary but slower and coarser. Core and
source CLI tests provide faster feedback, easier fixture construction, and more
precise failure localization.

## Implementation Plan

1. Add core verifier tests in `src/core/verify-deck.test.ts`.
2. Add runtime rendering tests in `src/node/view-renderer.test.ts` if the
   behavior is not already fully covered through CLI command tests.
3. Keep and expand source CLI tests in `src/cli/index.test.ts` for argument
   parsing, command mode behavior, output JSON, exit codes, and filesystem side
   effects.
4. Add packaged CLI tests in a separate file that runs only after `pnpm build`
   has produced `dist/cli/index.js`.
5. Add shared fixture helpers for valid, invalid, static-overflow, rendered
   overflow, allowed-overflow, and same-basename deck cases.
6. Add or adjust package scripts so local and CI gates can run:
   - fast unit and source CLI tests with `pnpm test`
   - packaged CLI tests after `pnpm build`
   - browser editor E2E with `pnpm test:e2e`
7. Ensure temporary preview and fixture directories are ignored and cleaned
   between tests.
8. Document the distinction between `starry-slides`, `pnpm --silent
   starry-slides`, and non-silent package-script invocation where agent
   stdout parsing matters.

## Verification

- [ ] `pnpm test` runs core verifier tests and source CLI tests.
- [ ] Core verifier tests prove all required structure, static overflow,
      summary, and mode semantics without spawning the CLI.
- [ ] Source CLI tests prove command parsing, exit codes, JSON stdout,
      stderr behavior, preview side effects, and verify-before-open behavior.
- [ ] Packaged CLI tests run after `pnpm build` and invoke `dist/cli/index.js`
      or the package bin without `tsx`.
- [ ] At least one test proves documented JSON-safe invocation through
      `pnpm --silent starry-slides`.
- [ ] `view` tests prove single-slide, all-slide, exact `--slide`, default
      output directory, explicit `--out-dir`, and stale preview cleanup.
- [ ] `verify` tests prove Complete Verify catches rendered overflow while
      Static Verify skips rendered checks.
- [ ] `open` tests prove failure does not start the editor and success startup
      behavior is covered without leaving child processes running.
- [ ] Temporary deck and preview directories are cleaned after tests.
- [ ] Editor Playwright E2E remains separate from CLI process tests.
