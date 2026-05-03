import { spawn } from "node:child_process";
import readline from "node:readline";

let devUrl = "http://localhost:5173/";

const child = spawn(
  "pnpm",
  [
    "--parallel",
    "--filter",
    "@starry-slide/core",
    "--filter",
    "@starry-slide/editor",
    "--filter",
    "web",
    "dev",
  ],
  {
    stdio: ["inherit", "pipe", "pipe"],
    shell: process.platform === "win32",
  }
);

let urlTimer = null;

function printUrl() {
  console.log("");
  console.log(`Editor URL: ${devUrl}`);
  console.log("");
}

function stopUrlTimer() {
  if (urlTimer) {
    clearInterval(urlTimer);
    urlTimer = null;
  }
}

function pipeOutput(stream, target) {
  const lineReader = readline.createInterface({ input: stream });

  lineReader.on("line", (line) => {
    target.write(`${line}\n`);

    const localUrlMatch = line.match(/Local:\s+(https?:\/\/\S+)/);
    if (localUrlMatch?.[1]) {
      devUrl = localUrlMatch[1];
      printUrl();
    }
  });
}

pipeOutput(child.stdout, process.stdout);
pipeOutput(child.stderr, process.stderr);

urlTimer = setInterval(printUrl, 5000);

child.on("exit", (code, signal) => {
  stopUrlTimer();

  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stopUrlTimer();
    child.kill(signal);
  });
}
