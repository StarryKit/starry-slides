import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";
import {
  DEFAULT_SLIDE_HEIGHT,
  DEFAULT_SLIDE_WIDTH,
  type PdfExportSelection,
  SLIDE_ROOT_ATTR,
  parseDimension,
  planPdfExport,
} from "../core";
import { type RenderedSlide, getManifestSlides } from "./view-renderer";

type ChromiumLauncher = typeof import("@playwright/test").chromium;

export interface PdfExportSlide {
  index: number;
  slideFile: string;
  title?: string;
  width: number;
  height: number;
}

export interface PdfExportResult {
  deck: string;
  mode: "all" | "single" | "slides";
  outFile: string;
  path: string;
  slides: PdfExportSlide[];
}

export async function exportPdf({
  deckPath,
  outFile,
  selection,
}: {
  deckPath: string;
  outFile: string;
  selection?: PdfExportSelection;
}): Promise<PdfExportResult> {
  const deck = path.resolve(process.cwd(), deckPath);
  const outputPath = path.resolve(process.cwd(), outFile);
  const manifestSlides = getManifestSlides(deck);
  const plan = planPdfExport({ slides: manifestSlides, selection });
  const selectedSlides = resolveSelectedSlides(
    manifestSlides,
    plan.slides.map((slide) => slide.file)
  );

  if (selectedSlides.length === 0) {
    throw new Error("PDF export requires at least one manifest slide.");
  }

  const sizedSlides = selectedSlides.map((slide) => ({
    ...slide,
    ...readSlideSize(slide.filePath),
  }));
  const [firstSlide] = sizedSlides;
  const mismatchedSlide = sizedSlides.find(
    (slide) => slide.width !== firstSlide.width || slide.height !== firstSlide.height
  );
  if (mismatchedSlide) {
    throw new Error(
      `PDF export requires selected slides to share one size; ${mismatchedSlide.file} is ${mismatchedSlide.width}x${mismatchedSlide.height}, expected ${firstSlide.width}x${firstSlide.height}.`
    );
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "starry-slides-pdf-"));
  const printFile = path.join(tempDir, "print.html");

  try {
    fs.writeFileSync(
      printFile,
      createPrintDocument({
        slides: sizedSlides,
        width: firstSlide.width,
        height: firstSlide.height,
      }),
      "utf8"
    );

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const chromium = await loadChromium();
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(pathToFileURL(printFile).href, { waitUntil: "load" });
      await page.evaluate("document.fonts ? document.fonts.ready : Promise.resolve()");
      await page.pdf({
        path: outputPath,
        width: `${firstSlide.width}px`,
        height: `${firstSlide.height}px`,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
        printBackground: true,
        preferCSSPageSize: true,
      });
    } finally {
      await browser.close();
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  return {
    deck,
    mode: plan.mode,
    outFile: outputPath,
    path: outputPath,
    slides: sizedSlides.map((slide) => ({
      index: slide.index,
      slideFile: slide.file,
      ...(slide.title ? { title: slide.title } : {}),
      width: slide.width,
      height: slide.height,
    })),
  };
}

function resolveSelectedSlides(slides: RenderedSlide[], selectedFiles: string[]): RenderedSlide[] {
  const slideByFile = new Map(slides.map((slide) => [slide.file, slide]));
  return selectedFiles.map((file) => {
    const slide = slideByFile.get(file);
    if (!slide) {
      throw new Error(`PDF export could not resolve selected slide file: ${file}`);
    }
    return slide;
  });
}

function readSlideSize(filePath: string): { width: number; height: number } {
  const dom = new JSDOM(fs.readFileSync(filePath, "utf8"), {
    virtualConsole: new VirtualConsole(),
  });
  const root = dom.window.document.querySelector<HTMLElement>(`[${SLIDE_ROOT_ATTR}]`);

  return {
    width: parseDimension(root?.getAttribute("data-slide-width") ?? null, DEFAULT_SLIDE_WIDTH),
    height: parseDimension(root?.getAttribute("data-slide-height") ?? null, DEFAULT_SLIDE_HEIGHT),
  };
}

function createPrintDocument({
  slides,
  width,
  height,
}: {
  slides: Array<RenderedSlide & { width: number; height: number }>;
  width: number;
  height: number;
}): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: ${width}px ${height}px; margin: 0; }
      html, body { margin: 0; padding: 0; width: ${width}px; background: white; }
      iframe {
        display: block;
        width: ${width}px;
        height: ${height}px;
        border: 0;
        margin: 0;
        padding: 0;
        break-after: page;
        page-break-after: always;
      }
      iframe:last-child {
        break-after: auto;
        page-break-after: auto;
      }
    </style>
  </head>
  <body>
    ${slides
      .map(
        (slide) =>
          `<iframe title="${escapeAttribute(slide.title ?? slide.file)}" src="${pathToFileURL(slide.filePath).href}"></iframe>`
      )
      .join("\n    ")}
  </body>
</html>`;
}

async function loadChromium(): Promise<ChromiumLauncher> {
  const require = createRequire(import.meta.url);
  const playwright = require("@playwright/test") as typeof import("@playwright/test");
  return playwright.chromium;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
