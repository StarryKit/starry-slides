import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { STARRY_SLIDES_EXPORT_ICON_PNG_BASE64 } from "@starrykit/slides-core";

export interface MacosCustomIconOptions {
  platform?: NodeJS.Platform | string;
  env?: NodeJS.ProcessEnv;
}

export function applyMacosCustomIcon(
  filePath: string,
  { platform = process.platform, env = process.env }: MacosCustomIconOptions = {}
): boolean {
  if (platform !== "darwin" || env.STARRY_SLIDES_DISABLE_MACOS_FILE_ICON === "1") {
    return false;
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "starry-slides-icon-"));
  const iconPath = path.join(tempDir, "icon.png");
  const resourcePath = path.join(tempDir, "icon.rsrc");

  try {
    fs.writeFileSync(iconPath, Buffer.from(STARRY_SLIDES_EXPORT_ICON_PNG_BASE64, "base64"));
    execFileSync("sips", ["-i", iconPath], { stdio: "ignore" });
    fs.writeFileSync(resourcePath, execFileSync("DeRez", ["-only", "icns", iconPath]));
    execFileSync("Rez", ["-append", resourcePath, "-o", filePath], { stdio: "ignore" });
    execFileSync("SetFile", ["-a", "C", filePath], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
