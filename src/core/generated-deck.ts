import type { ImportedSlideDeck, SlideDeckManifest, SlideModel } from "./slide-contract";
import { parseSlide } from "./slide-document";

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
  const manifestUrlObject = new URL(manifestBaseUrl);
  const slides = await Promise.all(
    manifest.slides.map(async (slide, index) => {
      const slideUrl = new URL(slide.file, manifestBaseUrl);
      for (const [key, value] of manifestUrlObject.searchParams) {
        if (!slideUrl.searchParams.has(key)) {
          slideUrl.searchParams.set(key, value);
        }
      }

      const slideResponse = await activeFetch(slideUrl.toString(), effectiveRequestInit);
      if (!slideResponse.ok) {
        throw new Error(`Failed to load slide HTML: ${slide.file}`);
      }

      const html = await slideResponse.text();
      const parsedSlide = parseSlide(html, `${slideIdPrefix}${index + 1}`);

      return {
        ...parsedSlide,
        hidden: slide.hidden === true,
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
