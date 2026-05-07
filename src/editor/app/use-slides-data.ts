import { useEffect, useRef, useState } from "react";
import {
  type PdfExportSelection,
  type SlideDeckManifest,
  type SlideModel,
  loadSlidesFromManifest,
} from "../../core";

interface SlidesDataResult {
  deckTitle: string;
  slides: SlideModel[];
  errorMessage: string | null;
  isLoading: boolean;
  isSaving: boolean;
  saveSlides: (slides: SlideModel[]) => void;
  exportPdf: (selection: PdfExportSelection) => Promise<void>;
  exportHtml: () => Promise<void>;
}

const GENERATED_MANIFEST_URL = "/deck/manifest.json";
const GENERATED_SAVE_URL = "/__editor/save-generated-deck";
const GENERATED_EXPORT_PDF_URL = "/__editor/export-pdf";
const GENERATED_EXPORT_HTML_URL = "/__editor/export-html";
const SAVE_DEBOUNCE_MS = 800;

interface SavePayloadSlide {
  file?: string;
  htmlSource?: string;
  title?: string;
  hidden?: boolean;
}

export function useSlidesData(): SlidesDataResult {
  const [deckTitle, setDeckTitle] = useState("Generated deck");
  const [slides, setSlides] = useState<SlideModel[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const manifestRef = useRef<SlideDeckManifest | null>(null);
  const loadedSlidesRef = useRef<SlideModel[]>([]);
  const latestSlidesRef = useRef<SlideModel[] | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const saveRequestIdRef = useRef(0);
  const isSaveInFlightRef = useRef(false);
  const savePromiseRef = useRef<Promise<void> | null>(null);
  const clientLoadedAtRef = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    loadSlidesFromManifest({
      manifestUrl: `${GENERATED_MANIFEST_URL}?v=${Date.now()}`,
    })
      .then((importedDeck) => {
        if (cancelled) {
          return;
        }

        if (!importedDeck) {
          setDeckTitle("Generated deck");
          setSlides([]);
          setErrorMessage("No slides were found at /deck/manifest.json.");
          setIsLoading(false);
          return;
        }

        manifestRef.current = importedDeck.manifest;
        setDeckTitle(importedDeck.manifest.topic || "Generated deck");
        setSlides(importedDeck.slides);
        loadedSlidesRef.current = importedDeck.slides;
        setErrorMessage(null);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setDeckTitle("Generated deck");
        setSlides([]);
        setErrorMessage("The app could not load the generated deck.");
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const flushSave = async (): Promise<void> => {
    const manifest = manifestRef.current;
    const nextSlides = latestSlidesRef.current;
    const saveRequestId = saveRequestIdRef.current;

    if (!manifest?.slides?.length || !nextSlides?.length) {
      return;
    }

    if (isSaveInFlightRef.current) {
      await savePromiseRef.current;
      if (saveRequestIdRef.current !== saveRequestId) {
        await flushSave();
      }
      return;
    }

    isSaveInFlightRef.current = true;

    const sourceFileBySlideId = new Map(
      loadedSlidesRef.current.map((slide, index) => [
        slide.id,
        slide.sourceFile ?? manifest.slides?.[index]?.file,
      ])
    );
    const manifestSlides = nextSlides.flatMap((slide) => {
      const file = slide.sourceFile ?? sourceFileBySlideId.get(slide.id);
      return file
        ? [
            {
              file,
              title: slide.title,
              hidden: slide.hidden === true ? true : undefined,
            },
          ]
        : [];
    });

    const savePromise = fetch(GENERATED_SAVE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientLoadedAt: clientLoadedAtRef.current,
        manifest: {
          ...manifest,
          slides: manifestSlides,
        },
        slides: nextSlides.map(
          (slide): SavePayloadSlide => ({
            file: slide.sourceFile ?? sourceFileBySlideId.get(slide.id),
            htmlSource: slide.htmlSource,
            title: slide.title,
            hidden: slide.hidden === true,
          })
        ),
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("The app could not write generated slides back to disk.");
        }
      })
      .catch((error) => {
        setErrorMessage("The app could not write generated slides back to disk.");
        throw error;
      })
      .finally(() => {
        isSaveInFlightRef.current = false;
        savePromiseRef.current = null;

        if (saveRequestIdRef.current !== saveRequestId) {
          if (!saveTimerRef.current) {
            saveTimerRef.current = window.setTimeout(() => {
              saveTimerRef.current = null;
              void flushSave();
            }, SAVE_DEBOUNCE_MS);
          }
          return;
        }

        setIsSaving(false);
      });
    savePromiseRef.current = savePromise;
    await savePromise;
  };

  const saveSlides = (nextSlides: SlideModel[]) => {
    if (loadedSlidesRef.current === nextSlides) {
      return;
    }

    const manifest = manifestRef.current;
    if (!manifest?.slides?.length) {
      return;
    }

    loadedSlidesRef.current = nextSlides;
    latestSlidesRef.current = nextSlides;
    saveRequestIdRef.current += 1;
    setIsSaving(true);

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      void flushSave();
    }, SAVE_DEBOUNCE_MS);
  };

  const exportPdf = async (selection: PdfExportSelection) => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    await flushSave();

    const response = await fetch(GENERATED_EXPORT_PDF_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ selection }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTitle = deckTitle.trim().replace(/[^a-zA-Z0-9._-]+/g, "-") || "starry-slides";
    link.href = url;
    link.download = `${safeTitle}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportHtml = async () => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    await flushSave();

    const response = await fetch(GENERATED_EXPORT_HTML_URL, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTitle = deckTitle.trim().replace(/[^a-zA-Z0-9._-]+/g, "-") || "starry-slides";
    link.href = url;
    link.download = `${safeTitle}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return {
    deckTitle,
    slides,
    errorMessage,
    isLoading,
    isSaving,
    saveSlides,
    exportPdf,
    exportHtml,
  };
}
