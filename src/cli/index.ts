#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { type VerifyResult, createVerifyResult, verifyDeck } from "../core/verify-deck";
import { resolveDeckPath } from "../node/deck-source";
import { startEditorServer } from "../node/editor-server";
import { exportHtml } from "../node/html-export";
import { openBrowser } from "../node/open-browser";
import { exportPdf } from "../node/pdf-export";
import { findAvailablePort } from "../node/ports";
import { renderPreviewManifest, verifyRenderedOverflow } from "../node/view-renderer";

type Command = "open" | "verify" | "view" | "export" | "add-skill" | "help";
type PdfExportMode = "all" | "slide" | "slides";

interface ParsedArgs {
  command: Command;
  deckPath?: string;
  staticVerify: boolean;
  viewMode?: "slide" | "all";
  exportFormat?: "pdf" | "html";
  exportMode?: PdfExportMode;
  slideFile?: string;
  slideFiles?: string[];
  outDir?: string;
  outFile?: string;
  passThroughArgs: string[];
}

const COMMANDS = new Set(["open", "verify", "view", "export", "add-skill", "help", "--help", "-h"]);

function usage(): string {
  return `Usage:
  starry-slides [deck]
  starry-slides open [deck]
  starry-slides verify [deck]
  starry-slides verify [deck] --static
  starry-slides view [deck] --slide <manifest-file>
  starry-slides view [deck] --all
  starry-slides view [deck] --all --out-dir <directory>
  starry-slides export pdf [deck] --out <file>
  starry-slides export pdf [deck] --all --out <file>
  starry-slides export pdf [deck] --slide <manifest-file> --out <file>
  starry-slides export pdf [deck] --slides <manifest-file>[,<manifest-file>...] --out <file>
  starry-slides export html [deck] --out <file>
  starry-slides add-skill [skills-options...]`;
}

function parseArgs(argv: string[]): ParsedArgs {
  const [first, ...rest] = argv;
  const command = normalizeCommand(first);
  if (command === "add-skill") {
    return {
      command,
      staticVerify: false,
      passThroughArgs: rest,
    };
  }

  const remaining = command === "open" && first && !COMMANDS.has(first) ? [first, ...rest] : rest;
  let deckPath: string | undefined;
  let staticVerify = false;
  let viewMode: ParsedArgs["viewMode"];
  let exportFormat: ParsedArgs["exportFormat"];
  let exportMode: ParsedArgs["exportMode"];
  let slideFile: string | undefined;
  let slideFiles: string[] | undefined;
  let outDir: string | undefined;
  let outFile: string | undefined;

  if (command === "export") {
    const format = remaining.shift();
    if (format !== "pdf" && format !== "html") {
      throw new Error("export requires a format: pdf or html");
    }
    exportFormat = format;
  }

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
      exportMode = "all";
      continue;
    }

    if (arg === "--slide") {
      const value = remaining[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--slide requires a manifest slide file value");
      }
      viewMode = "slide";
      exportMode = "slide";
      slideFile = value;
      index += 1;
      continue;
    }

    if (arg === "--slides") {
      const value = remaining[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--slides requires at least one manifest slide file value");
      }
      exportMode = "slides";
      slideFiles = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
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

    if (arg === "--out") {
      const value = remaining[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--out requires a file path");
      }
      outFile = value;
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

  return {
    command,
    deckPath,
    staticVerify,
    viewMode,
    exportFormat,
    exportMode,
    slideFile,
    slideFiles,
    outDir,
    outFile,
    passThroughArgs: [],
  };
}

function normalizeCommand(first: string | undefined): Command {
  if (!first) {
    return "open";
  }

  if (first === "help" || first === "--help" || first === "-h") {
    return "help";
  }

  if (
    first === "open" ||
    first === "verify" ||
    first === "view" ||
    first === "export" ||
    first === "add-skill"
  ) {
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

async function runExport(deckPath: string, parsed: ParsedArgs) {
  if (parsed.exportFormat !== "pdf" && parsed.exportFormat !== "html") {
    throw new Error("export requires a format: pdf or html");
  }
  if (parsed.staticVerify) {
    throw new Error(
      `export ${parsed.exportFormat} runs Static Verify internally; do not pass --static`
    );
  }
  if (!parsed.outFile) {
    throw new Error(`export ${parsed.exportFormat} requires --out <file>`);
  }

  const staticResult = await runStaticVerify(deckPath);
  if (!staticResult.ok) {
    writeJson(staticResult);
    process.exitCode = 1;
    return;
  }

  if (parsed.exportFormat === "html") {
    if (parsed.exportMode && parsed.exportMode !== "all") {
      throw new Error("export html currently supports full-deck export only");
    }
    const result = await exportHtml({
      deckPath,
      outFile: parsed.outFile,
    });
    writeJson(result);
    return;
  }

  const result = await exportPdf({
    deckPath,
    outFile: parsed.outFile,
    selection:
      parsed.exportMode === "slide"
        ? { mode: "slide", slideFile: parsed.slideFile }
        : parsed.exportMode === "slides"
          ? { mode: "slides", slideFiles: parsed.slideFiles }
          : { mode: "all" },
  });
  writeJson(result);
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

  const server = await startEditorServer({ deckPath, port });
  const closeServer = () => {
    void server.close().finally(() => process.exit(0));
  };

  console.error(`Opening Starry Slides at ${url}`);
  console.error("Press Ctrl+C to stop the editor server.");
  setTimeout(() => openBrowser(url), 750);
  process.on("SIGINT", closeServer);
  process.on("SIGTERM", closeServer);
}

function resolveSkillsBin(): string {
  const injectedBin = process.env.STARRY_SLIDES_SKILLS_BIN;
  if (injectedBin) {
    return injectedBin;
  }

  const require = createRequire(import.meta.url);
  const packageJsonPath = require.resolve("skills/package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
    bin?: string | Record<string, string>;
  };
  const binEntry = typeof packageJson.bin === "string" ? packageJson.bin : packageJson.bin?.skills;
  if (!binEntry) {
    throw new Error("Unable to locate the skills CLI binary from the skills package.");
  }
  return path.resolve(path.dirname(packageJsonPath), binEntry);
}

function runAddSkill(args: string[]): never {
  // ADR-0023: Starry Slides owns only this branded wrapper; installation belongs to skills.
  const result = spawnSync(
    process.execPath,
    [resolveSkillsBin(), "add", "StarryKit/starry-slides", "--skill", "starry-slides", ...args],
    {
      stdio: "inherit",
    }
  );

  if (result.error) {
    throw result.error;
  }

  process.exit(result.status ?? 1);
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.command === "help") {
    console.log(usage());
    return;
  }

  if (parsed.command === "add-skill") {
    runAddSkill(parsed.passThroughArgs);
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

  if (parsed.command === "export") {
    await runExport(deckPath, parsed);
    return;
  }

  await runOpen(deckPath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
