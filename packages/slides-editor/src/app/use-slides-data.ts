import {
  type PdfExportSelection,
  type SlideDeckManifest,
  type SlideModel,
  createSafeExportFilenameBase,
  loadSlidesFromManifest,
} from "@starrykit/slides-core";
import { useEffect, useRef, useState } from "react";

interface SlidesDataResult {
  deckTitle: string;
  deckDescription: string;
  slides: SlideModel[];
  decks: LocalDeckOption[];
  currentDeckId: string | null;
  errorMessage: string | null;
  isLoading: boolean;
  isSaving: boolean;
  isSwitchingDeck: boolean;
  saveSlides: (slides: SlideModel[]) => void;
  saveDeckTitle: (title: string) => void;
  switchDeck: (deckId: string) => Promise<void>;
  importDeck: (files: FileList) => Promise<void>;
  importDeckFromPicker: () => Promise<boolean>;
  exportPdf: (selection: PdfExportSelection) => Promise<void>;
  exportHtml: () => Promise<void>;
  exportSourceFiles: () => Promise<void>;
}

const GENERATED_MANIFEST_URL = "/deck/manifest.json";
const DECKS_URL = "/__editor/decks";
const SELECT_DECK_URL = "/__editor/select-deck";
const IMPORT_DECK_URL = "/__editor/import-deck";
const PICK_DECK_PATH_URL = "/__editor/pick-deck-path";
const GENERATED_SAVE_URL = "/__editor/save-generated-deck";
const GENERATED_EXPORT_PDF_URL = "/__editor/export-pdf";
const GENERATED_EXPORT_HTML_URL = "/__editor/export-html";
const GENERATED_EXPORT_SOURCE_FILES_URL = "/__editor/export-source-files";
const SAVE_DEBOUNCE_MS = 800;

interface SavePayloadSlide {
  file?: string;
  htmlSource?: string;
  title?: string;
  hidden?: boolean;
}

export interface LocalDeckOption {
  id: string;
  title: string;
  description?: string;
  directoryName: string;
  relativePath: string;
  isCurrent: boolean;
}

interface DeckListResponse {
  decks?: LocalDeckOption[];
  currentDeckId?: string | null;
}

interface PickDeckPathResponse {
  path?: string | null;
}

export function useSlidesData(): SlidesDataResult {
  const [deckTitle, setDeckTitle] = useState("Generated deck");
  const [deckDescription, setDeckDescription] = useState("Generated deck for Starry Slides.");
  const [slides, setSlides] = useState<SlideModel[]>([]);
  const [decks, setDecks] = useState<LocalDeckOption[]>([]);
  const [currentDeckId, setCurrentDeckId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingDeck, setIsSwitchingDeck] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const manifestRef = useRef<SlideDeckManifest | null>(null);
  const loadedSlidesRef = useRef<SlideModel[]>([]);
  const latestSlidesRef = useRef<SlideModel[] | null>(null);
  const latestDeckTitleRef = useRef<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const saveRequestIdRef = useRef(0);
  const isSaveInFlightRef = useRef(false);
  const savePromiseRef = useRef<Promise<void> | null>(null);
  const clientLoadedAtRef = useRef(Date.now());
  const loadRequestIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    void loadCurrentDeck({
      shouldApply: () => !cancelled,
    }).catch(() => {
      // loadCurrentDeck already updates the visible error state.
    });

    return () => {
      cancelled = true;
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const refreshDecks = async () => {
    const response = await fetch(DECKS_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("The app could not list local decks.");
    }

    const payload = (await response.json()) as DeckListResponse;
    setDecks(Array.isArray(payload.decks) ? payload.decks : []);
    setCurrentDeckId(typeof payload.currentDeckId === "string" ? payload.currentDeckId : null);
    return payload;
  };

  const loadCurrentDeck = async ({
    shouldApply,
  }: {
    shouldApply?: () => boolean;
  } = {}) => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;

    try {
      await refreshDecks();
    } catch {
      if (shouldApply?.() === false || loadRequestIdRef.current !== requestId) {
        return;
      }
      setDecks([]);
      setCurrentDeckId(null);
    }

    try {
      const importedDeck = await loadSlidesFromManifest({
        manifestUrl: `${GENERATED_MANIFEST_URL}?v=${Date.now()}`,
      });

      if (shouldApply?.() === false || loadRequestIdRef.current !== requestId) {
        return;
      }

      if (!importedDeck) {
        manifestRef.current = null;
        latestSlidesRef.current = null;
        loadedSlidesRef.current = [];
        latestDeckTitleRef.current = null;
        setDeckTitle("Generated deck");
        setDeckDescription("Generated deck for Starry Slides.");
        setSlides([]);
        setErrorMessage("No slides were found at /deck/manifest.json.");
        return;
      }

      manifestRef.current = importedDeck.manifest;
      const importedTitle = importedDeck.manifest.deckTitle || "Generated deck";
      const importedDescription =
        importedDeck.manifest.description || "Generated deck for Starry Slides.";
      latestDeckTitleRef.current = importedTitle;
      latestSlidesRef.current = null;
      clientLoadedAtRef.current = Date.now();
      setDeckTitle(importedTitle);
      setDeckDescription(importedDescription);
      setSlides(importedDeck.slides);
      loadedSlidesRef.current = importedDeck.slides;
      setErrorMessage(null);
      void refreshDecks().catch(() => undefined);
    } catch {
      if (shouldApply?.() === false || loadRequestIdRef.current !== requestId) {
        return;
      }

      manifestRef.current = null;
      latestSlidesRef.current = null;
      loadedSlidesRef.current = [];
      latestDeckTitleRef.current = null;
      setDeckTitle("Generated deck");
      setDeckDescription("Generated deck for Starry Slides.");
      setSlides([]);
      const message = "The app could not load the selected deck.";
      setErrorMessage(message);
      throw new Error(message);
    } finally {
      if (shouldApply?.() !== false && loadRequestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  };

  const flushSave = async (): Promise<void> => {
    const manifest = manifestRef.current;
    const nextSlides = latestSlidesRef.current ?? loadedSlidesRef.current;
    const nextDeckTitle = latestDeckTitleRef.current ?? deckTitle;
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
          deckTitle: nextDeckTitle,
          description: manifest.description ?? deckDescription,
          generatedAt:
            typeof manifest.generatedAt === "string" && manifest.generatedAt.trim()
              ? manifest.generatedAt
              : new Date().toISOString(),
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

  const saveDeckTitle = (nextTitle: string) => {
    const normalizedTitle = nextTitle.trim() || "Untitled deck";
    setDeckTitle(nextTitle);
    latestDeckTitleRef.current = normalizedTitle;
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

  const switchDeck = async (deckId: string) => {
    if (!deckId || deckId === currentDeckId || isSwitchingDeck) {
      return;
    }

    setIsSwitchingDeck(true);
    setErrorMessage(null);

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    try {
      await flushSave();

      const response = await fetch(SELECT_DECK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deckId }),
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, "The app could not select that deck.");
        setErrorMessage(message);
        throw new Error(message || "The app could not select that deck.");
      }

      const payload = (await response.json()) as DeckListResponse;
      setDecks(Array.isArray(payload.decks) ? payload.decks : []);
      setCurrentDeckId(typeof payload.currentDeckId === "string" ? payload.currentDeckId : deckId);
      await loadCurrentDeck();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The app could not switch decks.");
      throw error;
    } finally {
      setIsSwitchingDeck(false);
    }
  };

  const importDeck = async (files: FileList) => {
    if (!files.length || isSwitchingDeck) {
      return;
    }

    const selectedFiles = Array.from(files);
    setIsSwitchingDeck(true);
    setErrorMessage(null);

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    try {
      await flushSave();

      const response = await fetch(IMPORT_DECK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: await Promise.all(
            selectedFiles.map(async (file) => ({
              path: file.webkitRelativePath || file.name,
              contentsBase64: arrayBufferToBase64(await file.arrayBuffer()),
            }))
          ),
        }),
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, "The app could not import that deck.");
        setErrorMessage(message);
        throw new Error(message || "The app could not import that deck.");
      }

      const payload = (await response.json()) as DeckListResponse;
      setDecks(Array.isArray(payload.decks) ? payload.decks : []);
      setCurrentDeckId(typeof payload.currentDeckId === "string" ? payload.currentDeckId : null);
      await loadCurrentDeck();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The app could not import decks.");
      throw error;
    } finally {
      setIsSwitchingDeck(false);
    }
  };

  const importDeckFromPicker = async () => {
    if (isSwitchingDeck) {
      return false;
    }

    setIsSwitchingDeck(true);
    setErrorMessage(null);

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    try {
      await flushSave();

      const pickResponse = await fetch(PICK_DECK_PATH_URL, {
        method: "POST",
      });

      if (!pickResponse.ok) {
        const message = await readErrorMessage(
          pickResponse,
          "The app could not open the deck picker."
        );
        setErrorMessage(message);
        throw new Error(message || "The app could not open the deck picker.");
      }

      const pickPayload = (await pickResponse.json()) as PickDeckPathResponse;
      const pickedPath =
        typeof pickPayload.path === "string" && pickPayload.path.trim() ? pickPayload.path : null;
      if (!pickedPath) {
        return false;
      }

      const response = await fetch(IMPORT_DECK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path: pickedPath }),
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, "The app could not open that deck path.");
        setErrorMessage(message);
        throw new Error(message || "The app could not open that deck path.");
      }

      const payload = (await response.json()) as DeckListResponse;
      setDecks(Array.isArray(payload.decks) ? payload.decks : []);
      setCurrentDeckId(typeof payload.currentDeckId === "string" ? payload.currentDeckId : null);
      await loadCurrentDeck();
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The app could not open that deck.");
      throw error;
    } finally {
      setIsSwitchingDeck(false);
    }
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

    const safeTitle = createSafeExportFilenameBase(deckTitle);
    triggerDownload(await response.blob(), `${safeTitle}.pdf`);
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

    const safeTitle = createSafeExportFilenameBase(deckTitle);
    triggerDownload(await response.blob(), `${safeTitle}.html`);
  };

  const exportSourceFiles = async () => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    await flushSave();

    const response = await fetch(GENERATED_EXPORT_SOURCE_FILES_URL, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const safeTitle = createSafeExportFilenameBase(deckTitle);
    triggerDownload(await response.blob(), `${safeTitle}-source-files.zip`);
  };

  return {
    deckTitle,
    deckDescription,
    slides,
    decks,
    currentDeckId,
    errorMessage,
    isLoading,
    isSaving,
    isSwitchingDeck,
    saveSlides,
    saveDeckTitle,
    switchDeck,
    importDeck,
    importDeckFromPicker,
    exportPdf,
    exportHtml,
    exportSourceFiles,
  };
}

async function readErrorMessage(response: Response, fallback: string) {
  const text = await response.text();
  if (!text) {
    return fallback;
  }

  try {
    const payload = JSON.parse(text) as { error?: unknown };
    return typeof payload.error === "string" && payload.error.trim() ? payload.error : fallback;
  } catch {
    return text;
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }

  return window.btoa(binary);
}
