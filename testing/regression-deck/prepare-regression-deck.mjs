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

function main() {
  const workspaceRoot = path.resolve(new URL("../..", import.meta.url).pathname);
  const outputRoot = path.resolve(process.cwd(), getArg("--out-dir", "generated/regression-deck"));
  const appOutputRoot = path.resolve(
    process.cwd(),
    getArg("--app-out-dir", "apps/web/public/generated/current")
  );
  const sourceOutputRoot = path.resolve(
    process.cwd(),
    getArg("--source-out-dir", "generated/starry-slides-project-overview")
  );

  execFileSync(
    "node",
    [
      path.join(workspaceRoot, "packages/editor/tools/e2e/generate-regression-deck.mjs"),
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

  if (sourceOutputRoot !== outputRoot && sourceOutputRoot !== appOutputRoot) {
    fs.rmSync(sourceOutputRoot, { recursive: true, force: true });
    fs.mkdirSync(sourceOutputRoot, { recursive: true });
    fs.cpSync(outputRoot, sourceOutputRoot, { recursive: true });
  }
}

main();
