import { describe, expect, test } from "vitest";
import { createSafeExportFilenameBase } from "./export-filenames.js";

describe("export filenames", () => {
  test("preserves readable unicode titles", () => {
    expect(createSafeExportFilenameBase("中文演示文稿")).toBe("中文演示文稿");
    expect(createSafeExportFilenameBase("季度复盘 / Q2")).toBe("季度复盘 - Q2");
  });

  test("filters invalid filename characters and trailing dots", () => {
    expect(createSafeExportFilenameBase("Roadmap: Q2* / Draft?.")).toBe("Roadmap- Q2- - Draft");
  });

  test("falls back when the title cannot form a filename", () => {
    expect(createSafeExportFilenameBase("   ")).toBe("starry-slides");
    expect(createSafeExportFilenameBase("---")).toBe("starry-slides");
    expect(createSafeExportFilenameBase("..")).toBe("starry-slides");
  });
});
