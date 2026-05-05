import { spawn } from "node:child_process";
import path from "node:path";

function main() {
  const workspaceRoot = path.resolve(import.meta.dirname, "..", "..", "..");
  const child = spawn("pnpm", ["dev"], {
    cwd: workspaceRoot,
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
}

main();
