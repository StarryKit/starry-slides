import type { Command } from "commander/esm.mjs";
import { runExportHtml } from "./action";

export function registerExportCommand(program: Command) {
  const exportCommand = program.command("export").description("Export a deck.");

  exportCommand
    .command("html")
    .argument("[deck]", "deck path")
    .requiredOption("--out <file>", "write the single HTML file to this path")
    .description("Export a deck as one self-contained presenter HTML file.")
    .action(async (deckPath: string | undefined, options: { out?: string }) => {
      await runExportHtml(deckPath, options);
    });
}
