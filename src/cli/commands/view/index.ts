import type { Command } from "commander/esm.mjs";
import { resolveViewSelection, runView } from "./action";

export function registerViewCommand(program: Command) {
  const getRawArgs = () => process.argv.slice(2);

  program
    .command("view")
    .argument("[deck]", "deck path")
    .option("--slide <manifest-file>", "render exactly one manifest slide file")
    .option("--all", "render every manifest slide")
    .option("--out-dir <directory>", "write previews to a specific directory")
    .description("Render preview images for a deck.")
    .action(
      async (
        deckPath: string | undefined,
        options: { slide?: string; all?: boolean; outDir?: string }
      ) => {
        const normalizedOptions = resolveViewSelection(getRawArgs(), options);
        await runView(deckPath, normalizedOptions);
      }
    );
}
