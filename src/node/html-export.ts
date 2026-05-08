import fs from "node:fs";
import path from "node:path";
import {
  type HtmlExportSlide,
  createSingleHtmlExportDocument,
  planHtmlExportSlides,
} from "../core";
import { getManifestSlides } from "./view-renderer";

export interface HtmlExportResultSlide {
  index: number;
  slideFile: string;
  title?: string;
}

export interface HtmlExportResult {
  deck: string;
  mode: "all";
  outFile: string;
  path: string;
  slides: HtmlExportResultSlide[];
}

export async function exportHtml({
  deckPath,
  outFile,
}: {
  deckPath: string;
  outFile: string;
}): Promise<HtmlExportResult> {
  const deck = path.resolve(process.cwd(), deckPath);
  const outputPath = path.resolve(process.cwd(), outFile);
  const manifestSlides = getManifestSlides(deck);
  const slides: HtmlExportSlide[] = manifestSlides.map((slide) => ({
    file: slide.file,
    ...(slide.title ? { title: slide.title } : {}),
    ...(slide.hidden ? { hidden: slide.hidden } : {}),
    htmlSource: fs.readFileSync(slide.filePath, "utf8"),
  }));
  const html = createSingleHtmlExportDocument({
    title: path.basename(deck),
    slides,
  });
  const exportedSlides = planHtmlExportSlides(slides);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html, "utf8");

  return {
    deck,
    mode: "all",
    outFile: outputPath,
    path: outputPath,
    slides: exportedSlides.map((slide) => {
      const manifestSlide = manifestSlides.find((item) => item.file === slide.file);
      return {
        index: manifestSlide?.index ?? 0,
        slideFile: slide.file,
        ...(slide.title ? { title: slide.title } : {}),
      };
    }),
  };
}
