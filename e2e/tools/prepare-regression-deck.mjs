import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const regressionConfig = JSON.parse(
  fs.readFileSync(new URL("../fixtures/regression-deck/config.json", import.meta.url), "utf8")
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
  const outputRoot = path.resolve(process.cwd(), getArg("--out-dir", ".e2e-test-slides"));
  const appOutputRoot = path.resolve(process.cwd(), getArg("--app-out-dir", outputRoot));

  execFileSync(
    "node",
    [
      path.join(workspaceRoot, "e2e/tools/generate-regression-deck.mjs"),
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
}

main();
