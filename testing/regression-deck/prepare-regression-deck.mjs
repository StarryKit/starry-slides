import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const regressionConfig = JSON.parse(
  fs.readFileSync(new URL("./config.json", import.meta.url), "utf8")
);

function getArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return fallback;
  }

  return process.argv[index + 1] ?? fallback;
}

function copyDirectory(sourceDir, targetDir) {
  fs.rmSync(targetDir, { recursive: true, force: true });
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
  const workspaceRoot = path.resolve(new URL("../..", import.meta.url).pathname);
  const outputRoot = path.resolve(process.cwd(), getArg("--out-dir", "generated/regression-deck"));
  const appOutputRoot = path.resolve(
    process.cwd(),
    getArg("--app-out-dir", "apps/web/public/generated/current")
  );
  const sourceRoot = path.resolve(
    process.cwd(),
    getArg("--source-out-dir", "generated/html-slides-editor-project-overview")
  );

  execFileSync(
    "node",
    [
      path.join(workspaceRoot, "skills/html-slides-generator/generate-slides.mjs"),
      "--topic",
      regressionConfig.topic,
      "--summary",
      regressionConfig.summary,
      "--points",
      regressionConfig.points.join("|"),
      "--out-dir",
      outputRoot,
      "--app-out-dir",
      appOutputRoot,
    ],
    {
      cwd: workspaceRoot,
      stdio: "inherit",
    }
  );

  copyDirectory(appOutputRoot, sourceRoot);
}

main();
