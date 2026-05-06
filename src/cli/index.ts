#!/usr/bin/env node

import { spawn } from "node:child_process";
import { type VerifyResult, createVerifyResult, verifyDeck } from "../core/verify-deck";
import { resolveDeckPath } from "../runtime/deck-source";
import { openBrowser } from "../runtime/open-browser";
import { findAvailablePort } from "../runtime/ports";
import { renderPreviewManifest, verifyRenderedOverflow } from "../runtime/view-renderer";

type Command = "open" | "verify" | "view" | "add-skill" | "help";

interface ParsedArgs {
  command: Command;
  deckPath?: string;
  staticVerify: boolean;
  viewMode?: "slide" | "all";
  slideFile?: string;
  outDir?: string;
}

const COMMANDS = new Set(["open", "verify", "view", "add-skill", "help", "--help", "-h"]);

function usage(): string {
  return `Usage:
  starry-slides [deck]
  starry-slides open [deck]
  starry-slides verify [deck]
  starry-slides verify [deck] --static
  starry-slides view [deck] --slide <manifest-file>
  starry-slides view [deck] --all
  starry-slides view [deck] --all --out-dir <directory>
  starry-slides add-skill`;
}

function parseArgs(argv: string[]): ParsedArgs {
  const [first, ...rest] = argv;
  const command = normalizeCommand(first);
  const remaining = command === "open" && first && !COMMANDS.has(first) ? [first, ...rest] : rest;
  let deckPath: string | undefined;
  let staticVerify = false;
  let viewMode: ParsedArgs["viewMode"];
  let slideFile: string | undefined;
  let outDir: string | undefined;

  for (let index = 0; index < remaining.length; index += 1) {
    const arg = remaining[index];
    if (!arg) {
      continue;
    }

    if (arg === "--static") {
      staticVerify = true;
      continue;
    }

    if (arg === "--all") {
      viewMode = "all";
      continue;
    }

    if (arg === "--slide") {
      const value = remaining[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--slide requires a manifest slide file value");
      }
      viewMode = "slide";
      slideFile = value;
      index += 1;
      continue;
    }

    if (arg === "--out-dir") {
      const value = remaining[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--out-dir requires a directory path");
      }
      outDir = value;
      index += 1;
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (deckPath) {
      throw new Error(`Unexpected extra argument: ${arg}`);
    }
    deckPath = arg;
  }

  return { command, deckPath, staticVerify, viewMode, slideFile, outDir };
}

function normalizeCommand(first: string | undefined): Command {
  if (!first) {
    return "open";
  }

  if (first === "help" || first === "--help" || first === "-h") {
    return "help";
  }

  if (first === "open" || first === "verify" || first === "view" || first === "add-skill") {
    return first;
  }

  return "open";
}

function writeJson(value: unknown) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function runStaticVerify(deckPath: string): Promise<VerifyResult> {
  return verifyDeck(deckPath, { mode: "static" });
}

async function runCompleteVerify(deckPath: string): Promise<VerifyResult> {
  const staticResult = verifyDeck(deckPath, { mode: "static" });
  if (!staticResult.ok) {
    return createVerifyResult({
      deck: staticResult.deck,
      mode: "complete",
      checks: ["structure", "static-overflow", "rendered-overflow"],
      issues: staticResult.issues,
    });
  }

  const renderedIssues = await verifyRenderedOverflow(deckPath);
  return verifyDeck(deckPath, {
    mode: "complete",
    renderedIssues,
  });
}

async function runVerify(deckPath: string, mode: "static" | "complete"): Promise<boolean> {
  const result =
    mode === "static" ? await runStaticVerify(deckPath) : await runCompleteVerify(deckPath);
  writeJson(result);
  return result.ok;
}

async function runView(deckPath: string, parsed: ParsedArgs) {
  if (parsed.staticVerify) {
    throw new Error("view always runs Static Verify; do not pass --static");
  }
  if (parsed.viewMode === "slide" && !parsed.slideFile) {
    throw new Error("--slide requires a manifest slide file value");
  }
  if (!parsed.viewMode) {
    throw new Error("view requires either --slide <manifest-file> or --all");
  }

  const staticResult = await runStaticVerify(deckPath);
  if (!staticResult.ok) {
    writeJson(staticResult);
    process.exitCode = 1;
    return;
  }

  const manifest = await renderPreviewManifest({
    deckPath,
    slideFile: parsed.viewMode === "slide" ? parsed.slideFile : undefined,
    outDir: parsed.outDir,
  });
  writeJson(manifest);
}

async function runOpen(deckPath: string) {
  const result = await runCompleteVerify(deckPath);
  if (!result.ok) {
    writeJson(result);
    process.exitCode = 1;
    return;
  }

  const port = await findAvailablePort(Number(process.env.PORT ?? 5173));
  const url = `http://127.0.0.1:${port}/`;
  if (process.env.STARRY_SLIDES_TEST_STUB_OPEN === "1") {
    console.error(`Opening Starry Slides at ${url}`);
    console.error(`Editor startup stub: STARRY_SLIDES_DECK_DIR=${deckPath}`);
    return;
  }

  const child = spawn("vite", ["--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
    env: {
      ...process.env,
      STARRY_SLIDES_DECK_DIR: deckPath,
    },
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      child.kill(signal);
    });
  }

  console.error(`Opening Starry Slides at ${url}`);
  setTimeout(() => openBrowser(url), 750);
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.command === "help") {
    console.log(usage());
    return;
  }

  if (parsed.command === "add-skill") {
    console.error("add-skill is not implemented yet.");
    return;
  }

  const deckPath = resolveDeckPath(parsed.deckPath);

  if (parsed.command === "verify") {
    const ok = await runVerify(deckPath, parsed.staticVerify ? "static" : "complete");
    if (!ok) {
      process.exitCode = 1;
    }
    return;
  }

  if (parsed.command === "view") {
    await runView(deckPath, parsed);
    return;
  }

  await runOpen(deckPath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
