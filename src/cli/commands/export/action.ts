import { resolveDeckPath } from "../../../node/deck-source";
import { exportHtml } from "../../../node/html-export";

function writeJson(value: unknown) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export async function runExportHtml(deckPathArg: string | undefined, options: { out?: string }) {
  if (!options.out) {
    throw new Error("export html requires --out <file>");
  }

  const deckPath = resolveDeckPath(deckPathArg);
  const result = await exportHtml({
    deckPath,
    outFile: options.out,
  });
  writeJson(result);
}
