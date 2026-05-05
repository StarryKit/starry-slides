#!/usr/bin/env node

import { spawn } from "node:child_process";
import { formatVerifyDeckResult, hasVerifyErrors, verifyDeck } from "../core/verify-deck";
import { resolveDeckPath } from "../runtime/deck-source";
import { openBrowser } from "../runtime/open-browser";
import { findAvailablePort } from "../runtime/ports";

const COMMANDS = new Set(["open", "verify", "add-skill", "help", "--help", "-h"]);

function usage(): string {
  return `Usage:
  sslides [deck]
  sslides open [deck]
  sslides verify [deck]
  sslides add-skill`;
}

function parseArgs(argv: string[]) {
  const [first, second] = argv;

  if (!first) {
    return { command: "open", deckPath: undefined };
  }

  if (COMMANDS.has(first)) {
    return { command: first, deckPath: second };
  }

  return { command: "open", deckPath: first };
}

function runVerify(deckPath: string): boolean {
  const result = verifyDeck(deckPath);
  const output = formatVerifyDeckResult(result);
  if (output) {
    console.log(output);
  }

  return !hasVerifyErrors(result);
}

async function runOpen(deckPath: string) {
  if (!runVerify(deckPath)) {
    process.exitCode = 1;
    return;
  }

  const port = await findAvailablePort(Number(process.env.PORT ?? 5173));
  const url = `http://127.0.0.1:${port}/`;
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

  console.log(`Opening Starry Slides at ${url}`);
  setTimeout(() => openBrowser(url), 750);
}

async function main() {
  const { command, deckPath: rawDeckPath } = parseArgs(process.argv.slice(2));

  if (command === "help" || command === "--help" || command === "-h") {
    console.log(usage());
    return;
  }

  if (command === "add-skill") {
    console.log("add-skill is not implemented yet.");
    return;
  }

  const deckPath = resolveDeckPath(rawDeckPath);

  if (command === "verify") {
    if (!runVerify(deckPath)) {
      process.exitCode = 1;
    }
    return;
  }

  if (command === "open") {
    await runOpen(deckPath);
    return;
  }

  console.error(`Unknown command: ${command}`);
  console.error(usage());
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
