import { type SlideModel, injectBaseTag } from "@starrykit/slides-core";
import { toPng } from "html-to-image";

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
    doc.write(injectBaseTag(slide.htmlSource, slide.sourceFile));
    doc.close();

    await waitForFonts(doc);
    await waitForImages(doc);
    await wait(50);

    const root = doc.querySelector<HTMLElement>(slide.rootSelector);
    if (!root) {
      throw new Error("Slide root not found while rendering thumbnail.");
    }

    const renderTarget = createThumbnailRenderTarget(doc, doc.body ?? root, slide);

    return await renderThumbnailPng(doc, renderTarget, slide);
  } finally {
    iframe.remove();
  }
}

async function waitForImages(doc: Document) {
  const pendingImages = Array.from(doc.images).filter((image) => !image.complete);
  if (!pendingImages.length) {
    return;
  }

  await Promise.race([
    Promise.all(
      pendingImages.map(
        (image) =>
          new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          })
      )
    ),
    wait(750),
  ]);
}

async function renderThumbnailPng(doc: Document, renderTarget: HTMLElement, slide: SlideModel) {
  const thumbnailSize = getThumbnailSize(slide);
  const options = {
    cacheBust: true,
    pixelRatio: THUMBNAIL_PIXEL_RATIO,
    width: thumbnailSize.width,
    height: thumbnailSize.height,
    canvasWidth: thumbnailSize.width,
    canvasHeight: thumbnailSize.height,
    skipFonts: false,
  };

  try {
    return await toPng(renderTarget, options);
  } catch {
    removeBrokenImages(doc);
    return await toPng(renderTarget, options);
  }
}

function getThumbnailSize(slide: SlideModel) {
  return {
    width: THUMBNAIL_DISPLAY_WIDTH,
    height: Math.round((slide.height / slide.width) * THUMBNAIL_DISPLAY_WIDTH),
  };
}

function createThumbnailRenderTarget(doc: Document, root: HTMLElement, slide: SlideModel) {
  const thumbnailSize = getThumbnailSize(slide);
  const scale = Math.min(thumbnailSize.width / slide.width, thumbnailSize.height / slide.height);
  const scaledRoot = cloneSlideRoot(root);
  const frame = doc.createElement("div");
  const rootStyle = doc.defaultView?.getComputedStyle(root);
  const rootBackground = rootStyle?.background;

  frame.style.width = `${thumbnailSize.width}px`;
  frame.style.height = `${thumbnailSize.height}px`;
  frame.style.position = "relative";
  frame.style.overflow = "hidden";
  frame.style.margin = "0";
  frame.style.padding = "0";
  frame.style.boxSizing = "border-box";

  if (rootBackground && rootBackground !== "rgba(0, 0, 0, 0)" && rootBackground !== "transparent") {
    frame.style.background = rootBackground;
  }

  scaledRoot.style.width = `${slide.width}px`;
  scaledRoot.style.height = `${slide.height}px`;
  scaledRoot.style.position = "absolute";
  scaledRoot.style.left = "0";
  scaledRoot.style.top = "0";
  scaledRoot.style.margin = "0";
  scaledRoot.style.maxWidth = "none";
  scaledRoot.style.maxHeight = "none";
  scaledRoot.style.boxSizing = "border-box";
  scaledRoot.style.transform = `scale(${scale})`;
  scaledRoot.style.transformOrigin = "top left";

  frame.appendChild(scaledRoot);
  doc.body.appendChild(frame);

  return frame;
}

function cloneSlideRoot(root: HTMLElement) {
  return root.cloneNode(true) as HTMLElement;
}

function removeBrokenImages(doc: Document) {
  for (const image of Array.from(doc.images)) {
    if (image.complete && image.naturalWidth > 0) {
      continue;
    }

    image.remove();
  }
}
