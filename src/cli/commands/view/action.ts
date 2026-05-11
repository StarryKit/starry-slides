import { resolveDeckPath } from "../../../node/deck-source";
import { renderPreviewManifest } from "../../../node/view-renderer";
import { runFullVerify } from "../verify/action";

function writeJson(value: unknown) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function resolveViewSelection(argv: string[], options: { slide?: string; all?: boolean }) {
  let lastMode: "slide" | "all" | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--all") {
      lastMode = "all";
      continue;
    }
    if (arg === "--slide") {
      lastMode = "slide";
      index += 1;
    }
  }

  if (lastMode === "all") {
    return {
      ...options,
      all: true,
      slide: undefined,
    };
  }

  if (lastMode === "slide") {
    return {
      ...options,
      all: false,
    };
  }

  return options;
}

export async function runView(
  deckPathArg: string | undefined,
  options: { slide?: string; all?: boolean; outDir?: string }
) {
  if (!options.slide && !options.all) {
    throw new Error("view requires either --slide <manifest-file> or --all");
  }

  const deckPath = resolveDeckPath(deckPathArg);
  const verifyResult = await runFullVerify(deckPath);
  if (!verifyResult.ok) {
    writeJson(verifyResult);
    process.exitCode = 1;
    return;
  }

  const manifest = await renderPreviewManifest({
    deckPath,
    slideFile: options.all ? undefined : options.slide,
    outDir: options.outDir,
  });
  writeJson(manifest);
}
