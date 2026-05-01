import {
  type SlideDeckManifest,
  type SlideModel,
  loadSlidesFromManifest,
} from "@html-slides-editor/core";
import { useEffect, useRef, useState } from "react";

interface SlidesDataResult {
  deckTitle: string;
  slides: SlideModel[];
  sourceLabel: string;
  errorMessage: string | null;
  isLoading: boolean;
  isSaving: boolean;
  saveSlides: (slides: SlideModel[]) => void;
}

const GENERATED_MANIFEST_URL = "/generated/current/manifest.json";
const GENERATED_SAVE_URL = "/__editor/save-generated-deck";
const SAVE_DEBOUNCE_MS = 800;

export function useSlidesData(): SlidesDataResult {
  const [deckTitle, setDeckTitle] = useState("Generated deck");
  const [slides, setSlides] = useState<SlideModel[]>([]);
  const [sourceLabel, setSourceLabel] = useState("Generated deck");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const manifestRef = useRef<SlideDeckManifest | null>(null);
  const loadedSlidesRef = useRef<SlideModel[]>([]);
  const latestSlidesRef = useRef<SlideModel[] | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const saveRequestIdRef = useRef(0);
  const isSaveInFlightRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadSlidesFromManifest({
      manifestUrl: GENERATED_MANIFEST_URL,
    })
      .then((importedDeck) => {
        if (cancelled) {
          return;
        }

        if (!importedDeck) {
          setDeckTitle("Generated deck");
          setSlides([]);
          setSourceLabel("Generated deck unavailable");
          setErrorMessage("No generated deck was found at /generated/current/manifest.json.");
          setIsLoading(false);
          return;
        }

        manifestRef.current = importedDeck.manifest;
        setDeckTitle(importedDeck.manifest.topic || "Generated deck");
        setSlides(importedDeck.slides);
        loadedSlidesRef.current = importedDeck.slides;
        setSourceLabel(
          importedDeck.manifest.topic
            ? `Generated deck: ${importedDeck.manifest.topic}`
            : "Generated deck from skills/html-slides-generator"
        );
        setErrorMessage(null);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setDeckTitle("Generated deck");
        setSlides([]);
        setSourceLabel("Generated deck unavailable");
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

  const flushSave = () => {
    const manifest = manifestRef.current;
    const nextSlides = latestSlidesRef.current;
    const saveRequestId = saveRequestIdRef.current;

    if (!manifest?.slides?.length || !nextSlides?.length) {
      return;
    }

    if (isSaveInFlightRef.current) {
      return;
    }

    isSaveInFlightRef.current = true;

    void fetch(GENERATED_SAVE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        slides: nextSlides.map((slide, index) => ({
          file: manifest.slides?.[index]?.file,
          htmlSource: slide.htmlSource,
        })),
      }),
    })
      .catch(() => {
        setErrorMessage("The app could not write generated slides back to disk.");
      })
      .finally(() => {
        isSaveInFlightRef.current = false;

        if (saveRequestIdRef.current !== saveRequestId) {
          if (!saveTimerRef.current) {
            saveTimerRef.current = window.setTimeout(() => {
              saveTimerRef.current = null;
              flushSave();
            }, SAVE_DEBOUNCE_MS);
          }
          return;
        }

        setIsSaving(false);
      });
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
      flushSave();
    }, SAVE_DEBOUNCE_MS);
  };

  return { deckTitle, slides, sourceLabel, errorMessage, isLoading, isSaving, saveSlides };
}
