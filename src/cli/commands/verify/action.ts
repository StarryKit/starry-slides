import { resolveDeckPath } from "../../../node/deck-source";
import { type VerifyResult, verifyDeck } from "../../../node/verify-deck";
import { verifyRenderedOverflow } from "../../../node/view-renderer";

function writeJson(value: unknown) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export async function runFullVerify(deckPath: string): Promise<VerifyResult> {
  const renderedIssues = await verifyRenderedOverflow(deckPath);
  return verifyDeck(deckPath, {
    mode: "complete",
    renderedIssues,
  });
}

export async function runVerify(deckPathArg: string | undefined) {
  const deckPath = resolveDeckPath(deckPathArg);
  const result = await runFullVerify(deckPath);
  writeJson(result);
  if (!result.ok) {
    process.exitCode = 1;
  }
}
