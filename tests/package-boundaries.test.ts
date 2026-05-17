import fs from "node:fs";
import path from "node:path";
import { DEFAULT_SLIDE_WIDTH, planPdfExport } from "@starrykit/slides-core";
import { SlidesEditor, type SlidesEditorProps } from "@starrykit/slides-editor";
import { describe, expect, test } from "vitest";

const repo = process.cwd();

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as {
    name?: string;
    main?: string;
    module?: string;
    types?: string;
    exports?: Record<string, unknown>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    files?: string[];
    bin?: Record<string, string>;
  };
}

function sourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(entryPath);
    }
    return /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".test.ts") ? [entryPath] : [];
  });
}

describe("workspace package boundaries", () => {
  test("@starrykit/slides-core exposes browser-safe public APIs without runtime deps", () => {
    expect(DEFAULT_SLIDE_WIDTH).toBeGreaterThan(0);
    expect(
      planPdfExport({
        slides: [{ file: "slides/01.html", title: "One" }],
        selection: { mode: "all" },
      })
    ).toMatchObject({ mode: "all" });

    const pkg = readJson(path.join(repo, "packages/slides-core/package.json"));
    expect(pkg.name).toBe("@starrykit/slides-core");
    expect(pkg.main).toBe("./dist/index.js");
    expect(pkg.types).toBe("./dist/index.d.ts");
    expect(pkg.files).toEqual(["dist"]);

    const forbiddenDeps = [
      "react",
      "react-dom",
      "@playwright/test",
      "commander",
      "jsdom",
      "starry-slides",
    ];
    for (const dep of forbiddenDeps) {
      expect(pkg.dependencies ?? {}).not.toHaveProperty(dep);
      expect(pkg.peerDependencies ?? {}).not.toHaveProperty(dep);
    }

    const forbiddenSourcePattern =
      /from\s+["'](?:node:|react|react-dom|@playwright\/test|commander|jsdom|starry-slides)|from\s+["'](?:\.\.\/){2}src\/(?:node|cli|editor)/;
    const offenders = sourceFiles(path.join(repo, "packages/slides-core/src")).filter((file) =>
      forbiddenSourcePattern.test(fs.readFileSync(file, "utf8"))
    );
    expect(offenders).toEqual([]);
  });

  test("@starrykit/slides-editor exposes an embeddable component and host-driven props", () => {
    expect(SlidesEditor).toEqual(expect.any(Function));

    const props: SlidesEditorProps = {
      slides: [],
      deckTitle: "Deck",
      isSaving: false,
      onSlidesChange: () => {},
      onDeckTitleChange: () => {},
      onExportPdf: () => {},
      onExportHtml: () => {},
      onExportSourceFiles: () => {},
    };
    expect(props.deckTitle).toBe("Deck");

    const pkg = readJson(path.join(repo, "packages/slides-editor/package.json"));
    expect(pkg.name).toBe("@starrykit/slides-editor");
    expect(pkg.main).toBe("./dist/index.js");
    expect(pkg.types).toBe("./dist/index.d.ts");
    expect(pkg.dependencies).toHaveProperty("@starrykit/slides-core");
    expect(pkg.peerDependencies).toMatchObject({
      react: expect.any(String),
      "react-dom": expect.any(String),
    });
  });

  test("root starry-slides package keeps the CLI and Skill compatibility surface", () => {
    const pkg = readJson(path.join(repo, "package.json"));

    expect(pkg.name).toBe("starry-slides");
    expect(pkg.bin).toMatchObject({ "starry-slides": "dist/cli/index.js" });
    expect(pkg.files).toEqual(expect.arrayContaining(["dist", "skills", "README.md", "LICENSE"]));
    for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
      expect(version, `${name} must be publishable by npm`).not.toMatch(/^workspace:/);
    }
    expect(pkg.dependencies ?? {}).not.toHaveProperty("@starrykit/slides-core");
    expect(pkg.dependencies ?? {}).not.toHaveProperty("@starrykit/slides-editor");
    expect(pkg.devDependencies).toMatchObject({
      "@starrykit/slides-core": "workspace:*",
      "@starrykit/slides-editor": "workspace:*",
    });

    const skill = fs.readFileSync(path.join(repo, "skills/starry-slides/SKILL.md"), "utf8");
    expect(skill).toContain("npm install -g starry-slides");
    expect(skill).toContain("starry-slides verify <deck>");
    expect(skill).toContain("starry-slides view <deck> --all");
    expect(skill).toContain("starry-slides open <deck>");
  });
});
