import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";

const repo = process.cwd();
const tmpDeck = path.join(repo, ".tmp-cli-fixture");

function writeFixture() {
  fs.rmSync(tmpDeck, { recursive: true, force: true });
  fs.mkdirSync(path.join(tmpDeck, "slides"), { recursive: true });
  fs.writeFileSync(
    path.join(tmpDeck, "manifest.json"),
    JSON.stringify({ slides: [{ file: "slides/01.html", title: "One" }] }, null, 2)
  );
  fs.writeFileSync(
    path.join(tmpDeck, "slides/01.html"),
    stableSlideHtml('<h1 data-editable="text" data-editor-id="text-1">Hello</h1>')
  );
}

function stableSlideHtml(content: string, rootStyle = "") {
  return `<!DOCTYPE html><html><head><style>html,body{margin:0;width:800px;height:600px;overflow:hidden} [data-slide-root]{position:relative;width:800px;height:600px;overflow:hidden} [data-editable]{position:absolute;box-sizing:border-box;left:20px;top:20px;width:240px;height:80px;margin:0}</style></head><body><main data-slide-root="true" data-slide-width="800" data-slide-height="600" data-editor-id="slide-root" style="${rootStyle}">${content}</main></body></html>`;
}

function runCli(args: string[]) {
  return spawnSync("pnpm", ["exec", "tsx", "src/cli/index.ts", ...args], {
    cwd: repo,
    encoding: "utf8",
  });
}

afterEach(() => {
  fs.rmSync(tmpDeck, { recursive: true, force: true });
});

describe("starry-slides cli", () => {
  test("verify defaults to complete json with clean stderr", () => {
    writeFixture();
    const result = runCli(["verify", tmpDeck]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const parsed = JSON.parse(result.stdout);
    expect(parsed.mode).toBe("complete");
    expect(parsed.ok).toBe(true);
    expect(parsed.checks).toEqual(["structure", "static-overflow", "rendered-overflow"]);
  });

  test("verify static emits json", () => {
    writeFixture();
    const output = execFileSync(
      "pnpm",
      ["exec", "tsx", "src/cli/index.ts", "verify", tmpDeck, "--static"],
      {
        cwd: repo,
        encoding: "utf8",
      }
    );
    const parsed = JSON.parse(output);
    expect(parsed.mode).toBe("static");
    expect(parsed.ok).toBe(true);
  });

  test("view slide emits preview manifest json", () => {
    writeFixture();
    const output = execFileSync(
      "pnpm",
      ["exec", "tsx", "src/cli/index.ts", "view", tmpDeck, "--slide", "slides/01.html"],
      {
        cwd: repo,
        encoding: "utf8",
      }
    );
    const parsed = JSON.parse(output);
    expect(parsed.mode).toBe("single");
    expect(parsed.slides).toHaveLength(1);
    expect(parsed.slides[0]).toMatchObject({
      index: 0,
      slideFile: "slides/01.html",
      file: expect.stringMatching(/\.png$/),
      scale: 1,
    });
    expect(fs.existsSync(parsed.slides[0].path)).toBe(true);
  });

  test("view all emits every manifest slide in preview manifest json", () => {
    writeFixture();
    fs.writeFileSync(
      path.join(tmpDeck, "manifest.json"),
      JSON.stringify(
        {
          slides: [
            { file: "slides/01.html", title: "One" },
            { file: "slides/02.html", title: "Two" },
          ],
        },
        null,
        2
      )
    );
    fs.writeFileSync(
      path.join(tmpDeck, "slides/02.html"),
      stableSlideHtml('<p data-editable="text" data-editor-id="text-2">Second</p>')
    );

    const result = runCli(["view", tmpDeck, "--all"]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const parsed = JSON.parse(result.stdout);
    expect(parsed.mode).toBe("all");
    expect(parsed.slides.map((slide: { slideFile: string }) => slide.slideFile)).toEqual([
      "slides/01.html",
      "slides/02.html",
    ]);
    for (const slide of parsed.slides as Array<{ path: string }>) {
      expect(fs.existsSync(slide.path)).toBe(true);
    }
  });

  test("view supports overriding the output directory", () => {
    writeFixture();
    const outDir = path.join(tmpDeck, "custom-preview");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "stale.png"), "stale");

    const result = runCli(["view", tmpDeck, "--all", "--out-dir", outDir]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const parsed = JSON.parse(result.stdout);
    expect(parsed.outputDir).toBe(outDir);
    expect(parsed.slides).toHaveLength(1);
    expect(parsed.slides[0].path).toContain(outDir);
    expect(fs.existsSync(parsed.slides[0].path)).toBe(true);
    expect(fs.existsSync(path.join(outDir, "stale.png"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDeck, ".starry-slides", "view"))).toBe(false);
  });

  test("view slide rejects non-manifest slide references exactly", () => {
    writeFixture();
    const result = runCli(["view", tmpDeck, "--slide", "1"]);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("--slide must match a manifest slide file exactly: 1");
    expect(fs.existsSync(path.join(tmpDeck, ".starry-slides", "view"))).toBe(false);
  });

  test("view stops on static verify failure before writing previews", () => {
    writeFixture();
    fs.writeFileSync(
      path.join(tmpDeck, "slides/01.html"),
      stableSlideHtml(
        '<h1 data-editable="text" data-editor-id="text-1">Hello</h1>',
        "overflow: scroll"
      )
    );

    const result = runCli(["view", tmpDeck, "--all"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toBe("");
    const parsed = JSON.parse(result.stdout);
    expect(parsed.mode).toBe("static");
    expect(parsed.ok).toBe(false);
    expect(parsed.issues.map((issue: { code: string }) => issue.code)).toContain("overflow.static");
    expect(fs.existsSync(path.join(tmpDeck, ".starry-slides", "view"))).toBe(false);
  });

  test("open stops on complete verify failure before launching the editor", () => {
    writeFixture();
    fs.writeFileSync(
      path.join(tmpDeck, "slides/01.html"),
      `<!DOCTYPE html><html><head><style>html,body{margin:0;width:800px;height:600px;overflow:hidden} [data-slide-root]{position:relative;width:800px;height:600px;overflow:hidden}</style></head><body><main data-slide-root="true" data-slide-width="800" data-slide-height="600" data-editor-id="slide-root"><div data-editable="block" data-editor-id="block-1" style="position:absolute; left:760px; top:20px; width:100px; height:100px;">Outside</div></main></body></html>`
    );

    const result = runCli(["open", tmpDeck]);

    expect(result.status).toBe(1);
    expect(result.stderr).not.toContain("Opening Starry Slides");
    const parsed = JSON.parse(result.stdout);
    expect(parsed.mode).toBe("complete");
    expect(parsed.ok).toBe(false);
    expect(parsed.issues.map((issue: { code: string }) => issue.code)).toContain(
      "overflow.element-bounds"
    );
  });

  test("complete verify reports rendered overflow while static verify skips it", () => {
    writeFixture();
    fs.writeFileSync(
      path.join(tmpDeck, "slides/01.html"),
      `<!DOCTYPE html><html><body><main data-slide-root="true" data-slide-width="800" data-slide-height="600" data-editor-id="slide-root"><div data-editable="block" data-editor-id="block-1" style="position:absolute; left:760px; top:20px; width:100px; height:100px;">Outside</div></main></body></html>`
    );

    const staticOutput = execFileSync(
      "pnpm",
      ["exec", "tsx", "src/cli/index.ts", "verify", tmpDeck, "--static"],
      {
        cwd: repo,
        encoding: "utf8",
      }
    );
    expect(JSON.parse(staticOutput).ok).toBe(true);

    let completeOutput = "";
    try {
      execFileSync("pnpm", ["exec", "tsx", "src/cli/index.ts", "verify", tmpDeck], {
        cwd: repo,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      completeOutput = String((error as { stdout?: unknown }).stdout ?? "");
    }

    const completeResult = JSON.parse(completeOutput);
    expect(completeResult.ok).toBe(false);
    expect(completeResult.mode).toBe("complete");
    expect(completeResult.checks).toContain("rendered-overflow");
    expect(completeResult.issues.map((issue: { code: string }) => issue.code)).toContain(
      "overflow.element-bounds"
    );
  });
});
