import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface TestDeck {
  root: string;
  cleanup: () => void;
}

export function createTempDeck(prefix = "starry-slides-test-"): TestDeck {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return {
    root,
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

export function writeDeck(
  deck: string,
  slides: Array<{ file: string; title?: string; html?: string }>
) {
  fs.mkdirSync(deck, { recursive: true });
  fs.writeFileSync(
    path.join(deck, "manifest.json"),
    JSON.stringify(
      {
        slides: slides.map((slide) => ({
          file: slide.file,
          ...(slide.title ? { title: slide.title } : {}),
        })),
      },
      null,
      2
    )
  );

  for (const slide of slides) {
    const slidePath = path.join(deck, slide.file);
    fs.mkdirSync(path.dirname(slidePath), { recursive: true });
    fs.writeFileSync(slidePath, slide.html ?? slideHtml());
  }
}

export function slideHtml(content = textElement("text-1", "Hello"), rootStyle = "") {
  return `<!DOCTYPE html><html><head><style>
html,body{margin:0;width:800px;height:600px;overflow:hidden}
[data-slide-root]{position:relative;width:800px;height:600px;overflow:hidden;background:#fff}
[data-editable]{position:absolute;box-sizing:border-box;left:20px;top:20px;width:240px;height:80px;margin:0}
</style></head><body><main data-slide-root="true" data-slide-width="800" data-slide-height="600" data-editor-id="slide-root" style="${rootStyle}">${content}</main></body></html>`;
}

export function slideHtmlWithoutDimensions(content = textElement("text-1", "Hello")) {
  return `<!DOCTYPE html><html><body><main data-slide-root="true" data-editor-id="slide-root">${content}</main></body></html>`;
}

export function textElement(id: string, text: string, style = "") {
  return `<h1 data-editable="text" data-editor-id="${id}" style="${style}">${text}</h1>`;
}

export function blockElement(id: string, text: string, style = "") {
  return `<div data-editable="block" data-editor-id="${id}" style="${style}">${text}</div>`;
}
