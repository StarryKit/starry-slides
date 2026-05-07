import type { SlideDeckManifestEntry } from "./slide-contract";

export type PdfExportSelection =
  | { mode?: "all" }
  | { mode: "slide"; slideFile?: string }
  | { mode: "slides"; slideFiles?: string[] };

export type ResolvedPdfExportMode = "all" | "single" | "slides";

export interface ResolvedPdfExportSelection {
  mode: ResolvedPdfExportMode;
  slides: SlideDeckManifestEntry[];
}

export function planPdfExport({
  slides,
  selection,
}: {
  slides: SlideDeckManifestEntry[];
  selection?: PdfExportSelection;
}): ResolvedPdfExportSelection {
  const resolvedSelection = selection ?? { mode: "all" };
  const mode = resolvedSelection.mode ?? "all";

  if (mode === "all") {
    return { mode: "all", slides: [...slides] };
  }

  if (mode === "slide") {
    const slideFile = "slideFile" in resolvedSelection ? resolvedSelection.slideFile?.trim() : "";
    if (!slideFile) {
      throw new Error("--slide requires a manifest slide file value");
    }

    const slide = findSlide(slides, slideFile);
    if (!slide) {
      throw new Error(`--slide must match a manifest slide file exactly: ${slideFile}`);
    }

    return { mode: "single", slides: [slide] };
  }

  const slideFiles = "slideFiles" in resolvedSelection ? (resolvedSelection.slideFiles ?? []) : [];
  const requestedFiles = slideFiles.map((file) => file.trim()).filter(Boolean);
  if (requestedFiles.length === 0) {
    throw new Error("--slides requires at least one manifest slide file value");
  }

  const selectedSlides: SlideDeckManifestEntry[] = [];
  const missingFiles: string[] = [];
  for (const slideFile of requestedFiles) {
    const slide = findSlide(slides, slideFile);
    if (!slide) {
      missingFiles.push(slideFile);
      continue;
    }
    selectedSlides.push(slide);
  }

  if (missingFiles.length > 0) {
    throw new Error(`--slides must match manifest slide files exactly: ${missingFiles.join(", ")}`);
  }

  return { mode: "slides", slides: selectedSlides };
}

export function planPdfExportSlides(
  slides: SlideDeckManifestEntry[],
  selection?: PdfExportSelection
): SlideDeckManifestEntry[] {
  return planPdfExport({ slides, selection }).slides;
}

function findSlide(slides: SlideDeckManifestEntry[], slideFile: string) {
  return slides.find((slide) => slide.file === slideFile);
}
