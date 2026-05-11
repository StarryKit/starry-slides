import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { type VerifyIssue, createVerifyIssue, loadVerifyDeckSource } from "../core/verify-deck";

type PlaywrightPage = import("@playwright/test").Page;
type ChromiumLauncher = typeof import("@playwright/test").chromium;

export interface RenderedSlide {
  index: number;
  file: string;
  title?: string;
  hidden?: boolean;
  filePath: string;
}

export interface PreviewRender {
  index: number;
  slideFile: string;
  title?: string;
  file: string;
  path: string;
  width: number;
  height: number;
  scale: 1;
}

export interface PreviewManifest {
  deck: string;
  mode: "single" | "all";
  outputDir: string;
  slides: PreviewRender[];
}

interface OverflowMeasurement {
  code: string;
  selector?: string;
  message: string;
  details: Record<string, unknown>;
}

export function getManifestSlides(deckPath: string): RenderedSlide[] {
  const source = loadVerifyDeckSource(deckPath);
  const slidesByFile = new Map(
    source.manifest?.slides
      ?.filter(
        (slide): slide is { file: string; title?: string; hidden?: boolean } =>
          typeof slide.file === "string"
      )
      .map((slide, index) => [
        slide.file,
        {
          index,
          file: slide.file,
          title: typeof slide.title === "string" ? slide.title : undefined,
          hidden: slide.hidden === true,
          filePath: path.resolve(source.deck, slide.file),
        },
      ]) ?? []
  );

  return source.slideFiles.flatMap((file) => {
    const slide = slidesByFile.get(file);
    return slide && fs.existsSync(slide.filePath) ? [slide] : [];
  });
}

export async function verifyRenderedOverflow(deckPath: string): Promise<VerifyIssue[]> {
  const slides = getManifestSlides(deckPath);
  if (slides.length === 0) {
    return [];
  }

  const chromium = await loadChromium();
  const browser = await chromium.launch({ headless: true });
  try {
    const issues: VerifyIssue[] = [];
    const page = await browser.newPage();

    for (const slide of slides) {
      await loadSlide(page, slide.filePath);
      const measurements = await measureOverflow(page);
      for (const measurement of measurements) {
        issues.push(
          createVerifyIssue("error", measurement.code, measurement.message, {
            slideFile: slide.file,
            selector: measurement.selector,
            ...measurement.details,
          })
        );
      }
    }

    return issues;
  } finally {
    await browser.close();
  }
}

export async function renderPreviewManifest({
  deckPath,
  slideFile,
  outDir,
}: {
  deckPath: string;
  slideFile?: string;
  outDir?: string;
}): Promise<PreviewManifest> {
  const deck = path.resolve(process.cwd(), deckPath);
  const slides = getManifestSlides(deck);
  const selectedSlides = slideFile ? slides.filter((slide) => slide.file === slideFile) : slides;

  if (slideFile && selectedSlides.length === 0) {
    throw new Error(`--slide must match a manifest slide file exactly: ${slideFile}`);
  }

  const outputDir = outDir
    ? path.resolve(process.cwd(), outDir)
    : path.join(deck, ".starry-slides", "view");
  clearPreviewOutput(outputDir);

  const chromium = await loadChromium();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const renders: PreviewRender[] = [];

    for (const slide of selectedSlides) {
      const { width, height } = await loadSlide(page, slide.filePath);
      const file = `${previewFileStem(slide.file)}.png`;
      const imagePath = path.join(outputDir, file);
      await page.screenshot({
        path: imagePath,
        clip: { x: 0, y: 0, width, height },
      });
      renders.push({
        index: slide.index,
        slideFile: slide.file,
        ...(slide.title ? { title: slide.title } : {}),
        file,
        path: imagePath,
        width,
        height,
        scale: 1,
      });
    }

    return {
      deck,
      mode: slideFile ? "single" : "all",
      outputDir,
      slides: renders,
    };
  } finally {
    await browser.close();
  }
}

async function loadSlide(
  page: PlaywrightPage,
  filePath: string
): Promise<{ width: number; height: number }> {
  await page.goto(pathToFileURL(filePath).href, { waitUntil: "load" });
  const root = page.locator('[data-slide-root="true"]');
  if ((await root.count()) === 0) {
    return { width: 1920, height: 1080 };
  }
  const size = {
    width: Number((await root.getAttribute("data-slide-width")) || 1920),
    height: Number((await root.getAttribute("data-slide-height")) || 1080),
  };
  await page.setViewportSize(size);
  await page.evaluate("document.fonts ? document.fonts.ready : Promise.resolve()");
  return size;
}

async function measureOverflow(page: PlaywrightPage): Promise<OverflowMeasurement[]> {
  return page.evaluate<OverflowMeasurement[]>(`(() => {
    const root = document.querySelector('[data-slide-root="true"]');
    if (!root) {
      return [];
    }

    const roundRect = (rect) => ({
      left: Math.round(rect.left * 100) / 100,
      top: Math.round(rect.top * 100) / 100,
      right: Math.round(rect.right * 100) / 100,
      bottom: Math.round(rect.bottom * 100) / 100,
      width: Math.round(rect.width * 100) / 100,
      height: Math.round(rect.height * 100) / 100,
    });
    const selectorFor = (node) =>
      node.getAttribute("data-editor-id")
        ? '[data-editor-id="' + node.getAttribute("data-editor-id") + '"]'
        : node.getAttribute("data-editable")
          ? node.tagName.toLowerCase() + '[data-editable="' + node.getAttribute("data-editable") + '"]'
          : node.tagName.toLowerCase();
    const hasAllowedOverflow = (node) =>
      Boolean(node.closest('[data-allow-overflow="true"]'));
    const rootRect = root.getBoundingClientRect();
    const measurements = [];
    const tolerance = 1;

    if (!hasAllowedOverflow(root)) {
      const rootOverflowX = root.scrollWidth - root.clientWidth;
      const rootOverflowY = root.scrollHeight - root.clientHeight;
      if (rootOverflowX > tolerance || rootOverflowY > tolerance) {
        measurements.push({
          code: "overflow.slide",
          selector: selectorFor(root),
          message: "slide root has rendered overflow",
          details: {
            rootScrollWidth: root.scrollWidth,
            rootClientWidth: root.clientWidth,
            rootScrollHeight: root.scrollHeight,
            rootClientHeight: root.clientHeight,
          },
        });
      }
    }

    const body = document.body;
    if (body && !hasAllowedOverflow(body) && !hasAllowedOverflow(root)) {
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      const bodyOverflowX = Math.max(
        document.documentElement.scrollWidth,
        body.scrollWidth
      ) - viewportWidth;
      const bodyOverflowY = Math.max(
        document.documentElement.scrollHeight,
        body.scrollHeight
      ) - viewportHeight;

      if (bodyOverflowX > tolerance || bodyOverflowY > tolerance) {
        measurements.push({
          code: "overflow.slide",
          selector: "body",
          message: "document body has rendered overflow",
          details: {
            bodyScrollWidth: body.scrollWidth,
            bodyScrollHeight: body.scrollHeight,
            documentScrollWidth: document.documentElement.scrollWidth,
            documentScrollHeight: document.documentElement.scrollHeight,
            viewportWidth,
            viewportHeight,
          },
        });
      }
    }

    for (const node of Array.from(document.querySelectorAll("[data-editable]"))) {
      if (hasAllowedOverflow(node)) {
        continue;
      }

      const rect = node.getBoundingClientRect();
      if (
        rect.left < rootRect.left - tolerance ||
        rect.top < rootRect.top - tolerance ||
        rect.right > rootRect.right + tolerance ||
        rect.bottom > rootRect.bottom + tolerance
      ) {
        measurements.push({
          code: "overflow.element-bounds",
          selector: selectorFor(node),
          message: "editable element renders outside slide bounds",
          details: {
            elementRect: roundRect(rect),
            slideRect: roundRect(rootRect),
          },
        });
      }

      const overflowX = node.scrollWidth - node.clientWidth;
      const overflowY = node.scrollHeight - node.clientHeight;
      if (hasConstrainedContentBox(node) && (overflowX > tolerance || overflowY > tolerance)) {
        measurements.push({
          code: "overflow.element-content",
          selector: selectorFor(node),
          message: "editable element content has rendered overflow",
          details: {
            elementRect: roundRect(rect),
            scrollWidth: node.scrollWidth,
            clientWidth: node.clientWidth,
            scrollHeight: node.scrollHeight,
            clientHeight: node.clientHeight,
          },
        });
      }
    }

    return measurements;

    function hasConstrainedContentBox(node) {
      const style = window.getComputedStyle(node);
      const overflowValues = [
        style.overflow,
        style.overflowX,
        style.overflowY,
      ];
      const clipsOverflow = overflowValues.some((value) =>
        ["hidden", "clip", "auto", "scroll"].includes(value)
      );
      const hasExplicitBox =
        style.position === "absolute" ||
        style.position === "fixed" ||
        style.display === "block" ||
        style.display === "inline-block" ||
        style.display === "inline-flex" ||
        style.display === "flex" ||
        style.display === "grid" ||
        style.maxWidth !== "none" ||
        style.maxHeight !== "none" ||
        node.style.width ||
        node.style.height ||
        node.style.maxWidth ||
        node.style.maxHeight;

      return clipsOverflow && hasExplicitBox;
    }
  })()`);
}

async function loadChromium(): Promise<ChromiumLauncher> {
  const require = createRequire(import.meta.url);
  const playwright = require("@playwright/test") as typeof import("@playwright/test");
  return playwright.chromium;
}

function clearPreviewOutput(outputDir: string) {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });
}

function previewFileStem(slideFile: string): string {
  const safeName = slideFile.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/\.html?$/i, "");
  let hash = 0;
  for (let index = 0; index < slideFile.length; index += 1) {
    hash = (hash * 31 + slideFile.charCodeAt(index)) >>> 0;
  }
  return `${safeName}-${hash.toString(16).padStart(8, "0")}`;
}
