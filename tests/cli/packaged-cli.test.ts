import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, test } from "vitest";

const repo = process.cwd();
const distCli = path.join(repo, "dist", "cli", "index.js");
const decks: string[] = [];

function createDeck() {
  const deck = fs.mkdtempSync(path.join(os.tmpdir(), "starry-slides-packaged-"));
  decks.push(deck);
  fs.mkdirSync(path.join(deck, "slides"), { recursive: true });
  fs.writeFileSync(
    path.join(deck, "manifest.json"),
    JSON.stringify({ slides: [{ file: "slides/01.html", title: "One" }] }, null, 2)
  );
  fs.writeFileSync(path.join(deck, "slides/01.html"), slideHtml());
  return deck;
}

function createBrokenDeck() {
  const deck = fs.mkdtempSync(path.join(os.tmpdir(), "starry-slides-packaged-broken-"));
  decks.push(deck);
  fs.writeFileSync(path.join(deck, "manifest.json"), JSON.stringify({ slides: [] }));
  return deck;
}

function slideHtml(content = '<h1 data-editable="text" data-editor-id="text-1">Hello</h1>') {
  return `<!DOCTYPE html><html><head><style>
html,body{margin:0;width:800px;height:600px;overflow:hidden}
[data-slide-root]{position:relative;width:800px;height:600px;overflow:hidden;background:#fff}
[data-editable]{position:absolute;box-sizing:border-box;left:20px;top:20px;width:240px;height:80px;margin:0}
</style></head><body><main data-slide-root="true" data-slide-width="800" data-slide-height="600" data-editor-id="slide-root">${content}</main></body></html>`;
}

function runBuiltCli(args: string[], env: NodeJS.ProcessEnv = {}) {
  return spawnSync("node", [distCli, ...args], {
    cwd: repo,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

function parseJson(stdout: string) {
  return JSON.parse(stdout) as Record<string, unknown>;
}

beforeAll(() => {
  if (!fs.existsSync(distCli)) {
    throw new Error("Packaged CLI tests require pnpm build before pnpm test:packaged-cli.");
  }
});

afterEach(() => {
  for (const deck of decks.splice(0)) {
    fs.rmSync(deck, { recursive: true, force: true });
  }
});

describe("packaged starry-slides CLI", () => {
  test("built CLI starts without TypeScript runtime support and verifies a deck", () => {
    const deck = createDeck();

    const result = runBuiltCli(["verify", deck]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(parseJson(result.stdout)).toMatchObject({ ok: true, mode: "complete" });
    expect(result.stdout).not.toContain("tsx");
  });

  test("built view command writes PNG previews and a parseable preview manifest", () => {
    const deck = createDeck();
    const outDir = path.join(deck, "out");

    const result = runBuiltCli(["view", deck, "--slide", "slides/01.html", "--out-dir", outDir]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const parsed = parseJson(result.stdout);
    expect(parsed.mode).toBe("single");
    expect(parsed.slides as Array<{ path: string }>).toHaveLength(1);
    expect(fs.existsSync((parsed.slides as Array<{ path: string }>)[0].path)).toBe(true);
  });

  test("built verify exits one for a broken fixture", () => {
    const deck = createBrokenDeck();

    const result = runBuiltCli(["verify", deck]);

    expect(result.status).toBe(1);
    expect(result.stderr).toBe("");
    expect(parseJson(result.stdout)).toMatchObject({ ok: false, mode: "complete" });
  });

  test("built help prints usage text", () => {
    const result = runBuiltCli(["help"]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("starry-slides [deck]");
    expect(result.stdout).toContain("starry-slides view [deck] --all --out-dir <directory>");
  });

  test("built add-skill preserves reserved stub behavior", () => {
    const result = runBuiltCli(["add-skill"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("add-skill is not implemented yet.");
  });

  test("built default command delegates to open with JSON-free stdout", () => {
    const deck = createDeck();

    const result = runBuiltCli([deck], { STARRY_SLIDES_TEST_STUB_OPEN: "1" });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(`Editor startup stub: STARRY_SLIDES_DECK_DIR=${deck}`);
  });

  test("agent-facing packaged commands keep stdout JSON-only and stderr human-readable", () => {
    const deck = createBrokenDeck();

    const verify = runBuiltCli(["verify", deck]);

    expect(() => parseJson(verify.stdout)).not.toThrow();
    expect(verify.stderr).toBe("");

    const invalid = runBuiltCli(["view", deck, "--all"]);
    expect(() => parseJson(invalid.stdout)).not.toThrow();
    expect(invalid.stderr).toBe("");
  });
});
