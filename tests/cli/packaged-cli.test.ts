import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, test } from "vitest";
import packageJson from "../../package.json";
import { createTempDeck, writeDeck } from "../helpers/deck-fixtures";

const repo = process.cwd();
const distCli = path.join(repo, "dist", "cli", "index.js");
const decks: Array<{ cleanup: () => void }> = [];

function createDeck() {
  const deck = createTempDeck("starry-slides-packaged-");
  decks.push(deck);
  writeDeck(deck.root, [{ file: "slides/01.html", title: "One" }]);
  return deck.root;
}

function createBrokenDeck() {
  const deck = createTempDeck("starry-slides-packaged-broken-");
  decks.push(deck);
  fs.writeFileSync(path.join(deck.root, "manifest.json"), JSON.stringify({ slides: [] }));
  return deck.root;
}

function runBuiltCli(args: string[], env: NodeJS.ProcessEnv = {}) {
  return spawnSync("node", [distCli, ...args], {
    cwd: repo,
    encoding: "utf8",
    env: {
      ...process.env,
      STARRY_SLIDES_DISABLE_UPDATE_CHECK: "1",
      ...env,
    },
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
    deck.cleanup();
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
    expect(result.stdout).toContain("Usage: starry-slides [options] [command]");
    expect(result.stdout).toContain("view [options] [deck]");
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

  test("built CLI writes runtime update notices to stderr without polluting JSON stdout", () => {
    const deck = createDeck();
    const latestVersion = "9.9.9";

    const result = runBuiltCli(["verify", deck], {
      STARRY_SLIDES_DISABLE_UPDATE_CHECK: "0",
      STARRY_SLIDES_TEST_LATEST_VERSION: latestVersion,
    });

    expect(result.status).toBe(0);
    expect(parseJson(result.stdout)).toMatchObject({ ok: true, mode: "complete" });
    expect(result.stderr).toContain("Update available");
    expect(result.stderr).toContain("npm install -g starry-slides@latest");
  });
});
