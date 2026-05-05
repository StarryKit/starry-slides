import { toPng } from "html-to-image";
import type { SlideModel } from "./core";

const THUMBNAIL_DISPLAY_WIDTH = 224;
const THUMBNAIL_PIXEL_RATIO = 2;

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function waitForFonts(doc: Document) {
  if (!doc.fonts?.ready) {
    return;
  }

  try {
    await doc.fonts.ready;
  } catch {
    // Ignore font loading failures and render with fallback fonts.
  }
}

export async function renderSlideThumbnail(slide: SlideModel): Promise<string> {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.tabIndex = -1;
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = `${slide.width}px`;
  iframe.style.height = `${slide.height}px`;
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.border = "0";

  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) {
      throw new Error("Unable to access thumbnail iframe document.");
    }

    doc.open();
    doc.write(slide.htmlSource);
    doc.close();

    await waitForFonts(doc);
    await wait(50);

    const root = doc.querySelector<HTMLElement>(slide.rootSelector);
    if (!root) {
      throw new Error("Slide root not found while rendering thumbnail.");
    }

    const renderTarget = doc.body ?? root;

    return await toPng(renderTarget, {
      cacheBust: true,
      pixelRatio: THUMBNAIL_PIXEL_RATIO,
      canvasWidth: THUMBNAIL_DISPLAY_WIDTH,
      canvasHeight: Math.round((slide.height / slide.width) * THUMBNAIL_DISPLAY_WIDTH),
      backgroundColor: "white",
      skipFonts: false,
    });
  } finally {
    iframe.remove();
  }
}
