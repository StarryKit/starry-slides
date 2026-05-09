import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, test } from "vitest";
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
    env: { ...process.env, ...env },
  });
}

function createFakeSkillsBin(exitCode = 0) {
  const binDir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "starry-slides-skills-"));
  const binPath = path.join(binDir, "skills.mjs");
  const argvPath = path.join(binDir, "argv.json");
  fs.writeFileSync(
    binPath,
    [
      "import fs from 'node:fs';",
      "fs.writeFileSync(process.env.STARRY_SLIDES_FAKE_SKILLS_ARGV_PATH, JSON.stringify(process.argv.slice(2)));",
      "process.stdout.write('fake skills stdout\\n');",
      "process.stderr.write('fake skills stderr\\n');",
      `process.exit(${exitCode});`,
      "",
    ].join("\n")
  );
  return {
    argvPath,
    binPath,
    cleanup: () => fs.rmSync(binDir, { recursive: true, force: true }),
  };
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

  test("built export pdf command writes a PDF and parseable export result", () => {
    const deck = createDeck();
    const outFile = path.join(deck, "deck.pdf");

    const result = runBuiltCli(["export", "pdf", deck, "--out", outFile]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(parseJson(result.stdout)).toMatchObject({ mode: "all", outFile });
    expect(fs.existsSync(outFile)).toBe(true);
    expect(fs.readFileSync(outFile).subarray(0, 4).toString("utf8")).toBe("%PDF");
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
    expect(result.stdout).toContain("starry-slides export pdf [deck] --out <file>");
  });

  test("built add-skill delegates to skills add and forwards passthrough args", () => {
    const fakeSkills = createFakeSkillsBin();

    try {
      const result = runBuiltCli(["add-skill", "--agent", "codex", "-y"], {
        STARRY_SLIDES_SKILLS_BIN: fakeSkills.binPath,
        STARRY_SLIDES_FAKE_SKILLS_ARGV_PATH: fakeSkills.argvPath,
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toBe("fake skills stdout\n");
      expect(result.stderr).toBe("fake skills stderr\n");
      expect(JSON.parse(fs.readFileSync(fakeSkills.argvPath, "utf8"))).toEqual([
        "add",
        "StarryKit/starry-slides",
        "--skill",
        "starry-slides",
        "--agent",
        "codex",
        "-y",
      ]);
    } finally {
      fakeSkills.cleanup();
    }
  });

  test("built add-skill exits non-zero when delegated skills command fails", () => {
    const fakeSkills = createFakeSkillsBin(17);

    try {
      const result = runBuiltCli(["add-skill", "--all"], {
        STARRY_SLIDES_SKILLS_BIN: fakeSkills.binPath,
        STARRY_SLIDES_FAKE_SKILLS_ARGV_PATH: fakeSkills.argvPath,
      });

      expect(result.status).toBe(17);
      expect(result.stdout).toBe("fake skills stdout\n");
      expect(result.stderr).toBe("fake skills stderr\n");
      expect(JSON.parse(fs.readFileSync(fakeSkills.argvPath, "utf8"))).toEqual([
        "add",
        "StarryKit/starry-slides",
        "--skill",
        "starry-slides",
        "--all",
      ]);
    } finally {
      fakeSkills.cleanup();
    }
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
