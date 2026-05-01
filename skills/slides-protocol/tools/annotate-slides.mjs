import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const DEFAULT_WIDTH = "1920";
const DEFAULT_HEIGHT = "1080";

function getArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return fallback;
  }

  return process.argv[index + 1] ?? fallback;
}

function collectHtmlFiles(targetPath) {
  const resolvedPath = path.resolve(process.cwd(), targetPath);
  const stat = fs.statSync(resolvedPath);

  if (stat.isFile()) {
    return [resolvedPath];
  }

  const files = [];
  for (const entry of fs.readdirSync(resolvedPath, { withFileTypes: true })) {
    const entryPath = path.join(resolvedPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectHtmlFiles(entryPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

function ensureRoot(document) {
  const existingRoot = document.querySelector("[data-slide-root=\"true\"]");
  if (existingRoot) {
    return existingRoot;
  }

  const container = document.querySelector(".slide-container, .slide, main, section");
  if (container) {
    container.setAttribute("data-slide-root", "true");
    return container;
  }

  return null;
}

function annotateFile(filePath, outDir) {
  const sourceHtml = fs.readFileSync(filePath, "utf8");
  const dom = new JSDOM(sourceHtml);
  const { document } = dom.window;
  const root = ensureRoot(document);

  if (root) {
    if (!root.getAttribute("data-slide-width")) {
      root.setAttribute("data-slide-width", DEFAULT_WIDTH);
    }
    if (!root.getAttribute("data-slide-height")) {
      root.setAttribute("data-slide-height", DEFAULT_HEIGHT);
    }
    if (!root.getAttribute("data-editor-id")) {
      root.setAttribute("data-editor-id", "slide-root");
    }
  }

  const counters = {
    text: 0,
    image: 0,
    block: 0,
  };

  const editableNodes = Array.from(document.querySelectorAll("[data-editable]"));
  editableNodes.forEach((node) => {
    if (node.getAttribute("data-editor-id")) {
      return;
    }

    const editableType = node.getAttribute("data-editable");
    if (!editableType || !(editableType in counters)) {
      return;
    }

    counters[editableType] += 1;
    node.setAttribute("data-editor-id", `${editableType}-${counters[editableType]}`);
  });

  const outputPath = outDir
    ? path.join(outDir, path.basename(filePath))
    : filePath;

  if (outDir) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, `<!DOCTYPE html>\n${document.documentElement.outerHTML}`, "utf8");
  return outputPath;
}

function main() {
  const input = getArg("--input", "");
  const outDir = getArg("--out-dir", "");

  if (!input) {
    console.error("Usage: node annotate-slides.mjs --input <file-or-directory> [--out-dir <dir>]");
    process.exit(1);
  }

  const files = collectHtmlFiles(input);
  const resolvedOutDir = outDir ? path.resolve(process.cwd(), outDir) : "";

  for (const filePath of files) {
    const outputPath = annotateFile(filePath, resolvedOutDir);
    console.log(`Annotated ${filePath} -> ${outputPath}`);
  }
}

main();
