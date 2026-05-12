import type { Command } from "commander/esm.mjs";
import { runOpen } from "./action";

export function registerOpenCommand(program: Command) {
  program
    .command("open")
    .argument("[deck]", "deck path")
    .option("--port <number>", "preferred port for the editor server", Number)
    .description("Open the editor after complete verification.")
    .action(async (deckPath: string | undefined, options: { port?: number }) => {
      await runOpen(deckPath, options.port);
    });
}

export function registerDefaultOpen(program: Command) {
  program
    .argument("[deck]", "deck path")
    .option("--port <number>", "preferred port for the editor server", Number)
    .action(async (deckPath: string | undefined, options: { port?: number }) => {
      await runOpen(deckPath, options.port);
    });
}
