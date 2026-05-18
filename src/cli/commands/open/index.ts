import type { Command } from "commander/esm.mjs";
import { runOpen } from "./action";

export function registerOpenCommand(program: Command) {
  program
    .command("open")
    .argument("<deck>", "deck path")
    .option("--deck-library <dir>", "directory containing local manifest-backed deck folders")
    .option("--port <number>", "preferred port for the editor server", Number)
    .description("Open the editor after complete verification.")
    .action(async (deckPath: string, options: { deckLibrary?: string; port?: number }) => {
      await runOpen(deckPath, options.port, options.deckLibrary);
    });
}

export function registerDefaultOpen(program: Command) {
  program
    .argument("<deck>", "deck path")
    .option("--deck-library <dir>", "directory containing local manifest-backed deck folders")
    .option("--port <number>", "preferred port for the editor server", Number)
    .action(async (deckPath: string, options: { deckLibrary?: string; port?: number }) => {
      await runOpen(deckPath, options.port, options.deckLibrary);
    });
}
