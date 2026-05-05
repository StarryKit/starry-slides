import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

function getArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return fallback;
  }

  return process.argv[index + 1] ?? fallback;
}

function slugToTitle(value) {
  return value
    .replace(/^[0-9]+[-_]?/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function collectHtmlFiles(targetPath) {
  const resolvedPath = path.resolve(process.cwd(), targetPath);
  return fs
    .readdirSync(resolvedPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .map((entry) => path.join(resolvedPath, entry.name))
    .sort();
}

function getSlideMetadata(filePath, baseDir) {
  const html = fs.readFileSync(filePath, "utf8");
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const root = document.querySelector('[data-slide-root="true"]');
  const heading = document.querySelector("h1, h2, title");
  const title = heading?.textContent?.trim() || slugToTitle(path.basename(filePath, ".html"));

  return {
    file: path.relative(baseDir, filePath),
    title,
    archetype: root?.getAttribute("data-archetype") || undefined,
    stylePack: root?.getAttribute("data-style-pack") || undefined,
  };
}

function main() {
  const inputDir = getArg("--input-dir", "");
  const outputPathArg = getArg("--output", "");
  const deckTitle = getArg("--deck-title", "Generated deck");
  const topic = getArg("--topic", deckTitle);

  if (!inputDir) {
    console.error("Usage: node build-manifest.mjs --input-dir <dir> [--output <file>]");
    process.exit(1);
  }

  const resolvedInputDir = path.resolve(process.cwd(), inputDir);
  const files = collectHtmlFiles(resolvedInputDir);
  const manifest = {
    deckTitle,
    topic,
    generatedAt: new Date().toISOString(),
    slides: files.map((filePath) => getSlideMetadata(filePath, resolvedInputDir)),
  };

  const outputPath = outputPathArg
    ? path.resolve(process.cwd(), outputPathArg)
    : path.join(path.dirname(resolvedInputDir), "manifest.json");

  fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Wrote manifest for ${files.length} slide(s) to ${outputPath}`);
}

main();
