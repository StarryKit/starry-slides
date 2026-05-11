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
  slides: Array<{ id?: string; title?: string; html?: string }>
) {
  fs.mkdirSync(deck, { recursive: true });
  fs.writeFileSync(path.join(deck, "deck.html"), createDeckHtml(slides), "utf8");
}

export const VALID_SLIDE_CSS = `*{box-sizing:border-box}
body{margin:0;overflow:hidden;font-family:sans-serif}
slides{display:block}
slide{display:block;width:800px;height:600px;overflow:hidden;position:relative}
[data-editor-id]:not([data-slide-root]){position:absolute;box-sizing:border-box;left:20px;top:20px;width:240px;height:80px;margin:0}`;

export function slideHtml(content = textElement("text-1", "Hello"), rootStyle = "") {
  return `<!DOCTYPE html><html><head><style>
${VALID_SLIDE_CSS}
</style></head><body><main data-slide-root="true" data-slide-width="800" data-slide-height="600" data-editor-id="slide-root" style="${rootStyle}">${content}</main></body></html>`;
}

export function slideHtmlWithCss(
  css: string,
  content = textElement("text-1", "Hello")
) {
  return `<!DOCTYPE html><html><head><style>${css}</style></head><body><main data-slide-root="true" data-editor-id="slide-root">${content}</main></body></html>`;
}

export function slideHtmlWithoutCss(content = textElement("text-1", "Hello")) {
  return `<!DOCTYPE html><html><body><main data-slide-root="true" data-editor-id="slide-root">${content}</main></body></html>`;
}

export function textElement(id: string, text: string, style = "") {
  return `<h1 data-editor-id="${id}" style="${style}">${text}</h1>`;
}

export function blockElement(id: string, text: string, style = "") {
  return `<div data-editor-id="${id}" style="${style}">${text}</div>`;
}

function createDeckHtml(slides: Array<{ id?: string; title?: string; html?: string }>) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
  </head>
  <body>
    <slides title="Generated deck" width="800" height="600">
${slides
  .map((slide, index) => {
    const html = slide.html ?? slideHtml();
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const title = escapeAttribute(slide.title ?? `Slide ${index + 1}`);
    const id = slide.id?.trim() || `slide-${index + 1}`;
    const headNodes = (headMatch?.[1] ?? "")
      .trim()
      .split(/(?=<(?:style|link|script|meta|title)\b)/i)
      .filter(Boolean);
    return `      <slide id="${id}" title="${title}">
${headNodes.map((node) => `        ${node.trim()}`).join("\n")}${headNodes.length > 0 ? "\n" : ""}        ${(bodyMatch?.[1] ?? "").trim()}
      </slide>`;
  })
  .join("\n")}
    </slides>
  </body>
</html>`;
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
