import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const version = process.argv[2];

if (!version) {
  throw new Error("Usage: node .github/workflows/sync-release-version.mjs <version>");
}

const files = [
  "package.json",
  "packages/slides-core/package.json",
  "packages/slides-editor/package.json",
];

for (const relativeFile of files) {
  const filePath = path.join(rootDir, relativeFile);
  const pkg = JSON.parse(fs.readFileSync(filePath, "utf8"));
  pkg.version = version;

  if (relativeFile === "package.json") {
    pkg.dependencies["@starrykit/slides-core"] = version;
    pkg.dependencies["@starrykit/slides-editor"] = version;
  }

  if (relativeFile === "packages/slides-editor/package.json") {
    pkg.dependencies["@starrykit/slides-core"] = version;
  }

  fs.writeFileSync(filePath, `${JSON.stringify(pkg, null, 2)}\n`);
}
