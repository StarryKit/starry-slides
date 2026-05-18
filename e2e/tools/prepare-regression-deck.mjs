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

function generateDeck({ workspaceRoot, outputRoot, deckTitle, description, summary, points }) {
  execFileSync(
    "node",
    [
      path.join(workspaceRoot, "e2e/tools/generate-regression-deck.mjs"),
      "--deck-title",
      deckTitle,
      "--description",
      description,
      "--summary",
      summary,
      "--points",
      points.join("|"),
      "--out-dir",
      outputRoot,
    ],
    {
      cwd: workspaceRoot,
      stdio: "inherit",
    }
  );
}

function main() {
  const workspaceRoot = path.resolve(new URL("../..", import.meta.url).pathname);
  const outputRoot = path.resolve(process.cwd(), getArg("--out-dir", ".e2e-test-slides"));

  generateDeck({
    workspaceRoot,
    outputRoot,
    deckTitle: regressionConfig.deckTitle,
    description: regressionConfig.description ?? regressionConfig.summary,
    summary: regressionConfig.summary,
    points: regressionConfig.points,
  });

  generateDeck({
    workspaceRoot,
    outputRoot: path.resolve(path.dirname(outputRoot), ".e2e-switcher-slides"),
    deckTitle: "Switcher Fixture Deck",
    description: "Secondary deck for local deck switcher coverage.",
    summary: "A compact deck used to verify local manifest-backed switching.",
    points: ["Choose a sibling deck", "Reload from manifest", "Keep saves local"],
  });
}

main();
