import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { createTempDeck, writeDeck } from "../../tests/helpers/deck-fixtures";

const repo = process.cwd();
const decks: Array<{ cleanup: () => void }> = [];

function createDeck() {
  const deck = createTempDeck("starry-slides-cli-export-");
  decks.push(deck);
  return deck.root;
}

function runCli(args: string[]) {
  return spawnSync("pnpm", ["exec", "tsx", "src/cli/index.ts", ...args], {
    cwd: repo,
    encoding: "utf8",
    env: {
      ...process.env,
      STARRY_SLIDES_TEST_STUB_OPEN: "1",
    },
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

describe("cli PDF export", () => {
  test("export pdf writes a single-slide PDF", () => {
    const deck = createDeck();
    writeDeck(deck, [{ file: "slides/01.html", title: "One" }]);
    const outFile = path.join(deck, "single.pdf");

    const result = runCli(["export", "pdf", deck, "--slide", "slides/01.html", "--out", outFile]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const parsed = parseJson(result.stdout);
    expect(parsed.mode).toBe("single");
    expect(parsed.outFile).toBe(outFile);
    expect(fs.existsSync(outFile)).toBe(true);
    expect(fs.readFileSync(outFile).subarray(0, 4).toString("utf8")).toBe("%PDF");
  });

  test("export pdf supports deck-wide and selected-subset exports", () => {
    const deck = createDeck();
    writeDeck(deck, [
      { file: "slides/01.html", title: "One" },
      { file: "slides/02.html", title: "Two" },
      { file: "slides/03.html", title: "Three" },
    ]);
    const allOut = path.join(deck, "all.pdf");
    const subsetOut = path.join(deck, "subset.pdf");

    const allResult = runCli(["export", "pdf", deck, "--all", "--out", allOut]);
    const subsetResult = runCli([
      "export",
      "pdf",
      deck,
      "--slides",
      "slides/03.html,slides/01.html",
      "--out",
      subsetOut,
    ]);

    expect(allResult.status).toBe(0);
    expect(parseJson(allResult.stdout)).toMatchObject({ mode: "all", outFile: allOut });
    expect(subsetResult.status).toBe(0);
    expect(parseJson(subsetResult.stdout)).toMatchObject({ mode: "slides", outFile: subsetOut });
  });

  test("export pdf rejects invalid slide references", () => {
    const deck = createDeck();
    writeDeck(deck, [{ file: "slides/01.html", title: "One" }]);
    const outFile = path.join(deck, "bad.pdf");

    const result = runCli(["export", "pdf", deck, "--slide", "1", "--out", outFile]);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("--slide must match a manifest slide file exactly: 1");
    expect(fs.existsSync(outFile)).toBe(false);
  });
});
