import fs from "node:fs";
import path from "node:path";

function getArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return fallback;
  }

  return process.argv[index + 1] ?? fallback;
}

function copyDirectory(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
      continue;
    }

    fs.copyFileSync(sourcePath, targetPath);
  }
}

function main() {
  const deckDir = getArg("--deck-dir", "");
  if (!deckDir) {
    console.error("Usage: node install-current-deck.mjs --deck-dir <deck-package-dir>");
    process.exit(1);
  }

  const workspaceRoot = path.resolve(import.meta.dirname, "..", "..", "..");
  const sourceDir = path.resolve(process.cwd(), deckDir);
  const targetDir = path.join(workspaceRoot, "apps/web/public/generated/current");
  const manifestPath = path.join(sourceDir, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    console.error(`Deck package is missing manifest.json: ${manifestPath}`);
    process.exit(1);
  }

  fs.rmSync(targetDir, { recursive: true, force: true });
  copyDirectory(sourceDir, targetDir);
  console.log(`Installed deck package into ${targetDir}`);
}

main();
