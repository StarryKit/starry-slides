import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const VALID_EDITABLE_TYPES = new Set(["text", "image", "block"]);

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

function validateFile(filePath) {
  const html = fs.readFileSync(filePath, "utf8");
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const errors = [];
  const warnings = [];
  const roots = Array.from(document.querySelectorAll('[data-slide-root="true"]'));

  if (roots.length === 0) {
    errors.push('missing required [data-slide-root="true"]');
  }

  if (roots.length > 1) {
    errors.push("found multiple slide roots");
  }

  const root = roots[0] ?? null;
  if (root) {
    if (!root.getAttribute("data-slide-width")) {
      warnings.push("missing data-slide-width, default 1920 will be assumed");
    }
    if (!root.getAttribute("data-slide-height")) {
      warnings.push("missing data-slide-height, default 1080 will be assumed");
    }
    if (!root.getAttribute("data-archetype")) {
      warnings.push("missing optional data-archetype hint");
    }
  }

  const editableNodes = Array.from(document.querySelectorAll("[data-editable]"));
  if (editableNodes.length === 0) {
    warnings.push("slide contains no editable nodes");
  }

  for (const node of editableNodes) {
    const editableType = node.getAttribute("data-editable") ?? "";
    if (!VALID_EDITABLE_TYPES.has(editableType)) {
      errors.push(
        `invalid data-editable value "${editableType}" on <${node.tagName.toLowerCase()}>`
      );
      continue;
    }

    if (editableType === "image" && node.tagName.toLowerCase() !== "img") {
      warnings.push(
        `editable image is <${node.tagName.toLowerCase()}> instead of <img>; parser support may be limited`
      );
    }
  }

  return { filePath, errors, warnings };
}

function main() {
  const input = getArg("--input", "");
  if (!input) {
    console.error("Usage: node validate-slides.mjs --input <file-or-directory>");
    process.exit(1);
  }

  const files = collectHtmlFiles(input);
  let errorCount = 0;
  let warningCount = 0;

  for (const filePath of files) {
    const result = validateFile(filePath);
    if (result.errors.length === 0 && result.warnings.length === 0) {
      console.log(`OK ${filePath}`);
      continue;
    }

    console.log(`CHECK ${filePath}`);
    for (const error of result.errors) {
      errorCount += 1;
      console.log(`  ERROR: ${error}`);
    }
    for (const warning of result.warnings) {
      warningCount += 1;
      console.log(`  WARN: ${warning}`);
    }
  }

  console.log(
    `Validated ${files.length} file(s); ${errorCount} error(s), ${warningCount} warning(s).`
  );

  if (errorCount > 0) {
    process.exit(1);
  }
}

main();
