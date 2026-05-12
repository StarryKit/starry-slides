import path from "node:path";

export function resolveDeckPath(deckPath: string | undefined): string {
  if (deckPath?.trim()) {
    return path.resolve(process.cwd(), deckPath);
  }

  return path.resolve(import.meta.dirname, "../../.e2e-test-slides");
}
