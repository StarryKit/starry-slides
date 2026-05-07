import type { SlideModel } from "./slide-contract";
import { parseSlide } from "./slide-document";

const DEFAULT_NEW_SLIDE_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Untitled Slide</title>
  </head>
  <body>
    <main
      data-slide-root="true"
      data-slide-width="1920"
      data-slide-height="1080"
      data-editor-id="slide-root"
      style="position: relative; width: 1920px; height: 1080px; overflow: hidden; background: #ffffff;"
    >
      <h1 data-editable="text" data-editor-id="text-1" style="position: absolute; left: 160px; top: 160px; width: 1200px; margin: 0; font-size: 96px; line-height: 1.05;">
        Untitled Slide
      </h1>
    </main>
  </body>
</html>`;

export function createUniqueSlideId(slides: SlideModel[], preferredId: string): string {
  const existingIds = new Set(slides.map((slide) => slide.id));
  if (!existingIds.has(preferredId)) {
    return preferredId;
  }

  let index = 2;
  while (existingIds.has(`${preferredId}-${index}`)) {
    index += 1;
  }

  return `${preferredId}-${index}`;
}

export function createUniqueSlideSourceFile(slides: SlideModel[], preferredFile: string): string {
  const existingFiles = new Set(slides.map((slide) => slide.sourceFile).filter(Boolean));
  if (!existingFiles.has(preferredFile)) {
    return preferredFile;
  }

  const extensionIndex = preferredFile.lastIndexOf(".");
  const base = extensionIndex >= 0 ? preferredFile.slice(0, extensionIndex) : preferredFile;
  const extension = extensionIndex >= 0 ? preferredFile.slice(extensionIndex) : "";
  let index = 2;

  while (existingFiles.has(`${base}-${index}${extension}`)) {
    index += 1;
  }

  return `${base}-${index}${extension}`;
}

export function createBlankSlide(slides: SlideModel[], insertIndex: number): SlideModel {
  const position = Math.max(insertIndex + 1, 1);
  const slideId = createUniqueSlideId(slides, `generated-slide-${position}`);
  const sourceFile = createUniqueSlideSourceFile(
    slides,
    `${String(position).padStart(2, "0")}-untitled.html`
  );

  return {
    ...parseSlide(DEFAULT_NEW_SLIDE_HTML, slideId),
    hidden: false,
    sourceFile,
    title: "Untitled Slide",
  };
}

export function createDuplicatedSlide(slides: SlideModel[], sourceSlide: SlideModel): SlideModel {
  const slideId = createUniqueSlideId(slides, `${sourceSlide.id}-copy`);
  const sourceFile = createUniqueSlideSourceFile(
    slides,
    sourceSlide.sourceFile ? appendFileSuffix(sourceSlide.sourceFile, "copy") : `${slideId}.html`
  );

  return {
    ...parseSlide(sourceSlide.htmlSource, slideId),
    hidden: sourceSlide.hidden === true,
    sourceFile,
    title: sourceSlide.title,
  };
}

function appendFileSuffix(file: string, suffix: string): string {
  const extensionIndex = file.lastIndexOf(".");
  if (extensionIndex < 0) {
    return `${file}-${suffix}`;
  }

  return `${file.slice(0, extensionIndex)}-${suffix}${file.slice(extensionIndex)}`;
}
