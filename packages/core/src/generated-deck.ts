import { parseSlide } from "./slide-document";
import type { ImportedSlideDeck, SlideDeckManifest, SlideModel } from "./slide-contract";

export interface LoadSlidesFromManifestOptions {
  manifestUrl: string;
  fetchImpl?: typeof fetch;
  requestInit?: RequestInit;
  slideIdPrefix?: string;
}

export async function loadSlidesFromManifest({
  manifestUrl,
  fetchImpl,
  requestInit,
  slideIdPrefix = "generated-slide-",
}: LoadSlidesFromManifestOptions): Promise<ImportedSlideDeck | null> {
  const activeFetch = fetchImpl ?? globalThis.fetch;
  if (!activeFetch) {
    throw new Error("loadSlidesFromManifest requires a fetch implementation.");
  }

  const effectiveRequestInit = {
    cache: "no-store" as const,
    ...requestInit,
  };

  const manifestResponse = await activeFetch(manifestUrl, effectiveRequestInit);
  if (!manifestResponse.ok) {
    return null;
  }

  const manifest = (await manifestResponse.json()) as SlideDeckManifest;
  if (!manifest.slides?.length) {
    return null;
  }

  const manifestBaseUrl = manifestResponse.url || manifestUrl;
  const slides = await Promise.all(
    manifest.slides.map(async (slide, index) => {
      const slideResponse = await activeFetch(
        new URL(slide.file, manifestBaseUrl).toString(),
        effectiveRequestInit
      );
      if (!slideResponse.ok) {
        throw new Error(`Failed to load slide HTML: ${slide.file}`);
      }

      const html = await slideResponse.text();
      const parsedSlide = parseSlide(html, `${slideIdPrefix}${index + 1}`);

      return {
        ...parsedSlide,
        sourceFile: slide.file,
        title: slide.title || parsedSlide.title,
      } satisfies SlideModel;
    })
  );

  return {
    manifest,
    slides,
  };
}
