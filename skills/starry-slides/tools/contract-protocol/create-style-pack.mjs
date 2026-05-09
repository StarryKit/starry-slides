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
  const outDir = getArg("--out-dir", "");
  if (!outDir) {
    console.error("Usage: node create-style-pack.mjs --out-dir <dir>");
    process.exit(1);
  }

  const skillRoot = path.resolve(import.meta.dirname, "..", "..", "..");
  const workspaceRoot = path.resolve(skillRoot, "..", "..");
  const starterDir = path.join(workspaceRoot, "skills/slides-style-pack-starter/template");
  const targetDir = path.resolve(process.cwd(), outDir);

  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
    console.error(`Target directory is not empty: ${targetDir}`);
    process.exit(1);
  }

  copyDirectory(starterDir, targetDir);
  console.log(`Created style pack scaffold at ${targetDir}`);
}

main();
