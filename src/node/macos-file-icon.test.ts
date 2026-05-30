import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { applyMacosCustomIcon } from "./macos-file-icon";

const tempDirs: string[] = [];

function createTempFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "starry-slides-macos-icon-"));
  tempDirs.push(dir);
  const filePath = path.join(dir, "deck.html");
  fs.writeFileSync(filePath, "<!DOCTYPE html><title>Deck</title>");
  return filePath;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("macOS file icon helper", () => {
  test("skips non-macOS platforms", () => {
    const filePath = createTempFile();

    expect(applyMacosCustomIcon(filePath, { platform: "linux" })).toBe(false);
  });
});
