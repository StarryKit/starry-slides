import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import {
  blockElement,
  createTempDeck,
  slideHtml,
  textElement,
  writeDeck,
} from "../../tests/helpers/deck-fixtures";

const repo = process.cwd();
const decks: Array<{ cleanup: () => void }> = [];

function createDeck() {
  const deck = createTempDeck("starry-slides-cli-");
  decks.push(deck);
  return deck.root;
}

function writeValidDeck(deck = createDeck()) {
  writeDeck(deck, [{ file: "slides/01.html", title: "One" }]);
  return deck;
}

function runCli(args: string[], options: { env?: NodeJS.ProcessEnv } = {}) {
  return spawnSync("pnpm", ["exec", "tsx", "src/cli/index.ts", ...args], {
    cwd: repo,
    encoding: "utf8",
    env: { ...process.env, ...options.env },
  });
}

function runPackageScript(args: string[]) {
  return spawnSync("pnpm", ["--silent", "starry-slides", ...args], {
    cwd: repo,
    encoding: "utf8",
  });
}

function parseJson(stdout: string) {
  return JSON.parse(stdout) as Record<string, unknown>;
}

afterEach(() => {
  for (const deck of decks.splice(0)) {
    deck.cleanup();
  }
});

describe("source starry-slides cli", () => {
  test("verify defaults to complete JSON and no stderr", () => {
    const deck = writeValidDeck();

    const result = runCli(["verify", deck]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const parsed = parseJson(result.stdout);
    expect(parsed.mode).toBe("complete");
    expect(parsed.ok).toBe(true);
    expect(parsed.checks).toEqual(["structure", "static-overflow", "rendered-overflow"]);
  });

  test("verify with no deck uses the default deck resolution path", () => {
    const result = runCli(["verify", "--static"]);

    expect(result.stderr).toBe("");
    const parsed = parseJson(result.stdout);
    expect(result.status).toBe(parsed.ok ? 0 : 1);
    expect(parsed.mode).toBe("static");
    expect(parsed.deck).toContain("sample-slides");
  });

  test("verify static skips rendered checks", () => {
    const deck = writeValidDeck();

    const result = runCli(["verify", "--static", deck]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const parsed = parseJson(result.stdout);
    expect(parsed.mode).toBe("static");
    expect(parsed.checks).toEqual(["structure", "static-overflow"]);
    expect(parsed.ok).toBe(true);
  });

  test("failed verify exits one and writes parseable JSON to stdout", () => {
    const deck = createDeck();
    fs.writeFileSync(path.join(deck, "manifest.json"), JSON.stringify({ slides: [] }));

    const result = runCli(["verify", deck]);

    expect(result.status).toBe(1);
    expect(result.stderr).toBe("");
    const parsed = parseJson(result.stdout);
    expect(parsed.ok).toBe(false);
    expect((parsed.issues as Array<{ code: string }>).map((issue) => issue.code)).toContain(
      "structure.empty-manifest"
    );
  });

  test("pnpm --silent starry-slides keeps verify stdout JSON-parseable", () => {
    const deck = writeValidDeck();

    const result = runPackageScript(["verify", deck, "--static"]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(parseJson(result.stdout)).toMatchObject({ ok: true, mode: "static" });
  });

  test("view slide renders exactly one slide and writes diagnostics only to stderr", () => {
    const deck = writeValidDeck();

    const result = runCli(["view", deck, "--slide", "slides/01.html"]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const parsed = parseJson(result.stdout);
    expect(parsed.mode).toBe("single");
    expect(parsed.slides).toHaveLength(1);
    expect((parsed.slides as Array<{ slideFile: string; path: string }>)[0].slideFile).toBe(
      "slides/01.html"
    );
    expect(fs.existsSync((parsed.slides as Array<{ path: string }>)[0].path)).toBe(true);
  });

  test("view all renders every manifest slide", () => {
    const deck = createDeck();
    writeDeck(deck, [
      { file: "slides/01.html", title: "One" },
      { file: "slides/02.html", title: "Two" },
    ]);

    const result = runCli(["view", deck, "--all"]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const parsed = parseJson(result.stdout);
    expect(parsed.mode).toBe("all");
    expect((parsed.slides as Array<{ slideFile: string }>).map((slide) => slide.slideFile)).toEqual(
      ["slides/01.html", "slides/02.html"]
    );
  });

  test("view out-dir writes only to the explicit output directory and clears stale files", () => {
    const deck = writeValidDeck();
    const outDir = path.join(deck, "custom-preview");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "stale.png"), "stale");

    const result = runCli(["view", deck, "--all", "--out-dir", outDir]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const parsed = parseJson(result.stdout);
    expect(parsed.outputDir).toBe(outDir);
    expect(fs.existsSync(path.join(outDir, "stale.png"))).toBe(false);
    expect(fs.existsSync(path.join(deck, ".starry-slides", "view"))).toBe(false);
  });

  test("view slide combines exact selection with explicit out-dir", () => {
    const deck = createDeck();
    writeDeck(deck, [
      { file: "slides/01.html", title: "One" },
      { file: "slides/02.html", title: "Two" },
    ]);
    const outDir = path.join(deck, "single-preview");

    const result = runCli(["view", deck, "--slide", "slides/02.html", "--out-dir", outDir]);

    expect(result.status).toBe(0);
    const parsed = parseJson(result.stdout);
    expect(parsed.outputDir).toBe(outDir);
    expect(parsed.slides as Array<{ slideFile: string; path: string }>).toHaveLength(1);
    expect((parsed.slides as Array<{ slideFile: string; path: string }>)[0].slideFile).toBe(
      "slides/02.html"
    );
  });

  test("view refuses non-exact slide references such as indexes", () => {
    const deck = writeValidDeck();

    const result = runCli(["view", deck, "--slide", "1"]);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("--slide must match a manifest slide file exactly: 1");
    expect(fs.existsSync(path.join(deck, ".starry-slides", "view"))).toBe(false);
  });

  test("view runs static verify before rendering and writes no previews when static verify fails", () => {
    const deck = createDeck();
    writeDeck(deck, [
      {
        file: "slides/01.html",
        html: slideHtml(textElement("text-1", "Hello"), "overflow: scroll"),
      },
    ]);

    const result = runCli(["view", deck, "--all"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toBe("");
    const parsed = parseJson(result.stdout);
    expect(parsed.mode).toBe("static");
    expect((parsed.issues as Array<{ code: string }>).map((issue) => issue.code)).toContain(
      "overflow.static"
    );
    expect(fs.existsSync(path.join(deck, ".starry-slides", "view"))).toBe(false);
  });

  test("view invalid option states fail non-zero with human-readable stderr", () => {
    const deck = writeValidDeck();

    expect(runCli(["view", deck]).stderr).toContain(
      "view requires either --slide <manifest-file> or --all"
    );
    expect(runCli(["view", deck, "--static", "--all"]).stderr).toContain(
      "view always runs Static Verify; do not pass --static"
    );
    expect(runCli(["view", deck, "--slide"]).stderr).toContain(
      "--slide requires a manifest slide file value"
    );
    expect(runCli(["view", deck, "--all", "--out-dir"]).stderr).toContain(
      "--out-dir requires a directory path"
    );
  });

  test("export html writes one standalone presenter file", () => {
    const deck = writeValidDeck();
    const outFile = path.join(deck, "deck.html");

    const result = runCli(["export", "html", deck, "--out", outFile]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const parsed = parseJson(result.stdout);
    expect(parsed).toMatchObject({
      deck,
      mode: "all",
      outFile,
      path: outFile,
    });
    expect((parsed.slides as Array<{ slideFile: string }>).map((slide) => slide.slideFile)).toEqual(
      ["slides/01.html"]
    );
    const html = fs.readFileSync(outFile, "utf8");
    expect(html).toContain('data-starry-presenter="true"');
    expect(html).toContain("starryPresenterDeck");
  });

  test("view slide plus all follows last parser option wins semantics", () => {
    const deck = createDeck();
    writeDeck(deck, [
      { file: "slides/01.html", title: "One" },
      { file: "slides/02.html", title: "Two" },
    ]);

    const allResult = runCli(["view", deck, "--slide", "slides/01.html", "--all"]);
    const slideResult = runCli(["view", deck, "--all", "--slide", "slides/01.html"]);

    expect(parseJson(allResult.stdout).mode).toBe("all");
    expect(parseJson(slideResult.stdout).mode).toBe("single");
  });

  test("complete verify reports rendered overflow while static verify skips it", () => {
    const deck = createDeck();
    writeDeck(deck, [
      {
        file: "slides/01.html",
        html: `<!DOCTYPE html><html><body><main data-slide-root="true" data-slide-width="800" data-slide-height="600" data-editor-id="slide-root">${blockElement(
          "block-1",
          "Outside",
          "position:absolute;left:760px;top:20px;width:100px;height:100px"
        )}</main></body></html>`,
      },
    ]);

    const staticResult = runCli(["verify", deck, "--static"]);
    const completeResult = runCli(["verify", deck]);

    expect(parseJson(staticResult.stdout).ok).toBe(true);
    expect(completeResult.status).toBe(1);
    const completeJson = parseJson(completeResult.stdout);
    expect(completeJson.mode).toBe("complete");
    expect((completeJson.issues as Array<{ code: string }>).map((issue) => issue.code)).toContain(
      "overflow.element-bounds"
    );
  });

  test("open stops on complete verify failure before launching the editor", () => {
    const deck = createDeck();
    writeDeck(deck, [
      {
        file: "slides/01.html",
        html: `<!DOCTYPE html><html><body><main data-slide-root="true" data-slide-width="800" data-slide-height="600" data-editor-id="slide-root">${blockElement(
          "block-1",
          "Outside",
          "position:absolute;left:760px;top:20px;width:100px;height:100px"
        )}</main></body></html>`,
      },
    ]);

    const result = runCli(["open", deck], { env: { STARRY_SLIDES_TEST_STUB_OPEN: "1" } });

    expect(result.status).toBe(1);
    expect(result.stderr).not.toContain("Opening Starry Slides");
    expect(parseJson(result.stdout)).toMatchObject({ ok: false, mode: "complete" });
  });

  test("open starts the editor with the resolved deck path after complete verify succeeds", () => {
    const deck = writeValidDeck();

    const result = runCli(["open", deck], { env: { STARRY_SLIDES_TEST_STUB_OPEN: "1" } });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Opening Starry Slides at http://127.0.0.1:");
    expect(result.stderr).toContain(`Editor startup stub: STARRY_SLIDES_DECK_DIR=${deck}`);
  });

  test("default deck argument command behaves like open deck", () => {
    const deck = writeValidDeck();

    const result = runCli([deck], { env: { STARRY_SLIDES_TEST_STUB_OPEN: "1" } });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(`Editor startup stub: STARRY_SLIDES_DECK_DIR=${deck}`);
  });

  test("extra positional arguments and unknown options fail non-zero", () => {
    const deck = writeValidDeck();

    const extra = runCli([deck, "extra"]);
    const unknown = runCli(["verify", deck, "--bad"]);

    expect(extra.status).toBe(1);
    expect(extra.stderr).toContain("Unexpected extra argument: extra");
    expect(unknown.status).toBe(1);
    expect(unknown.stderr).toContain("Unknown option: --bad");
  });

  test("help variants print usage text with all supported command shapes", () => {
    for (const arg of ["help", "--help", "-h"]) {
      const result = runCli([arg]);
      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("starry-slides [deck]");
      expect(result.stdout).toContain("starry-slides open [deck]");
      expect(result.stdout).toContain("starry-slides verify [deck] --static");
      expect(result.stdout).toContain("starry-slides view [deck] --slide <manifest-file>");
      expect(result.stdout).toContain("starry-slides view [deck] --all --out-dir <directory>");
      expect(result.stdout).toContain("starry-slides export pdf [deck] --out <file>");
      expect(result.stdout).toContain("starry-slides export html [deck] --out <file>");
      expect(result.stdout).toContain(
        "starry-slides export pdf [deck] --slides <manifest-file>[,<manifest-file>...] --out <file>"
      );
      expect(result.stdout).toContain("starry-slides add-skill");
    }
  });

  test("add-skill preserves the reserved stub behavior", () => {
    const result = runCli(["add-skill"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("add-skill is not implemented yet.");
  });
});
