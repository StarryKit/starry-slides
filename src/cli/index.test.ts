import { spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import packageJson from "../../package.json";
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
    env: {
      ...process.env,
      STARRY_SLIDES_DISABLE_UPDATE_CHECK: "1",
      ...options.env,
    },
  });
}

function runPackageScript(args: string[]) {
  return spawnSync("pnpm", ["--silent", "starry-slides", ...args], {
    cwd: repo,
    encoding: "utf8",
    env: {
      ...process.env,
      STARRY_SLIDES_DISABLE_UPDATE_CHECK: "1",
    },
  });
}

function parseJson(stdout: string) {
  return JSON.parse(stdout) as Record<string, unknown>;
}

function holdPort(port: number): Promise<net.Server> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
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
    const result = runCli(["verify"]);

    expect(result.stderr).toBe("");
    const parsed = parseJson(result.stdout);
    expect(result.status).toBe(parsed.ok ? 0 : 1);
    expect(parsed.mode).toBe("complete");
    expect(parsed.deck).toContain(".e2e-test-slides");
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

    const result = runPackageScript(["verify", deck]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(parseJson(result.stdout)).toMatchObject({ ok: true, mode: "complete" });
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

  test("view runs full verify before rendering and writes no previews when rendered verify fails", () => {
    const deck = createDeck();
    writeDeck(deck, [
      {
        file: "slides/01.html",
        html: slideHtml(
          blockElement(
            "block-1",
            "Outside",
            "position:absolute;left:760px;top:20px;width:100px;height:100px"
          )
        ),
      },
    ]);

    const result = runCli(["view", deck, "--all"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toBe("");
    const parsed = parseJson(result.stdout);
    expect(parsed.mode).toBe("complete");
    expect((parsed.issues as Array<{ code: string }>).map((issue) => issue.code)).toContain(
      "overflow.element-bounds"
    );
    expect(fs.existsSync(path.join(deck, ".starry-slides", "view"))).toBe(false);
  });

  test("view invalid option states fail non-zero with human-readable stderr", () => {
    const deck = writeValidDeck();

    expect(runCli(["view", deck]).stderr).toContain(
      "view requires either --slide <manifest-file> or --all"
    );
    expect(runCli(["view", deck, "--static", "--all"]).stderr).toContain(
      "unknown option '--static'"
    );
    expect(runCli(["view", deck, "--slide"]).stderr).toContain(
      "option '--slide <manifest-file>' argument missing"
    );
    expect(runCli(["view", deck, "--all", "--out-dir"]).stderr).toContain(
      "option '--out-dir <directory>' argument missing"
    );
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

  test("verify reports rendered overflow by default", () => {
    const deck = createDeck();
    writeDeck(deck, [
      {
        file: "slides/01.html",
        html: slideHtml(
          blockElement(
            "block-1",
            "Outside",
            "position:absolute;left:760px;top:20px;width:100px;height:100px"
          )
        ),
      },
    ]);

    const result = runCli(["verify", deck]);

    expect(result.status).toBe(1);
    const parsed = parseJson(result.stdout);
    expect(parsed.mode).toBe("complete");
    expect((parsed.issues as Array<{ code: string }>).map((issue) => issue.code)).toContain(
      "overflow.element-bounds"
    );
  });

  test("open stops on complete verify failure before launching the editor", () => {
    const deck = createDeck();
    writeDeck(deck, [
      {
        file: "slides/01.html",
        html: slideHtml(
          blockElement(
            "block-1",
            "Outside",
            "position:absolute;left:760px;top:20px;width:100px;height:100px"
          )
        ),
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
    expect(extra.stderr).toContain("too many arguments");
    expect(unknown.status).toBe(1);
    expect(unknown.stderr).toContain("unknown option '--bad'");
  });

  test("help variants print usage text with all supported command shapes", () => {
    for (const arg of ["help", "--help", "-h"]) {
      const result = runCli([arg]);
      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("Usage: starry-slides [options] [command] [deck]");
      expect(result.stdout).toContain("open [options] [deck]");
      expect(result.stdout).toContain("verify [deck]");
      expect(result.stdout).toContain("view [options] [deck]");
    }
  });

  test("verify keeps stdout JSON-only while writing runtime update notices to stderr", () => {
    const deck = writeValidDeck();
    const latestVersion = "9.9.9";

    const result = runCli(["verify", deck], {
      env: {
        STARRY_SLIDES_DISABLE_UPDATE_CHECK: "0",
        STARRY_SLIDES_TEST_LATEST_VERSION: latestVersion,
      },
    });

    expect(result.status).toBe(0);
    expect(parseJson(result.stdout)).toMatchObject({ ok: true, mode: "complete" });
    expect(result.stderr).toContain(
      `Starry Slides runtime update available: current=${packageJson.version} latest=${latestVersion}.`
    );
    expect(result.stderr).toContain(
      "Agent action: upgrade the runtime package after this command completes."
    );
    expect(result.stderr).toContain("Run: npm install -g starry-slides@latest");
    expect(result.stderr).toContain("Current command may continue under the installed runtime.");
  });

  test("open --port uses the specified port when available", () => {
    const deck = writeValidDeck();

    const result = runCli(["open", deck, "--port", "5280"], {
      env: { STARRY_SLIDES_TEST_STUB_OPEN: "1" },
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toContain("http://127.0.0.1:5280/");
  });

  test("open --port auto-falls-back when the requested port is occupied", async () => {
    const deck = writeValidDeck();
    const blocker = await holdPort(5290);

    try {
      const result = runCli(["open", deck, "--port", "5290"], {
        env: { STARRY_SLIDES_TEST_STUB_OPEN: "1" },
      });

      expect(result.status).toBe(0);
      expect(result.stderr).toContain("Opening Starry Slides at http://127.0.0.1:5291/");
    } finally {
      await new Promise<void>((resolve) => blocker.close(() => resolve()));
    }
  });

  test("open defaults to port 5173 when no --port is specified", () => {
    const deck = writeValidDeck();

    const result = runCli(["open", deck], {
      env: { STARRY_SLIDES_TEST_STUB_OPEN: "1", PORT: "5173" },
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toContain("http://127.0.0.1:5173/");
  });
});
