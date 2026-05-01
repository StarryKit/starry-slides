import { type SlideModel, loadSlidesFromManifest } from "@html-slides-editor/core";
import { useEffect, useState } from "react";

interface SlidesDataResult {
  deckTitle: string;
  slides: SlideModel[];
  sourceLabel: string;
  errorMessage: string | null;
  isLoading: boolean;
}

const GENERATED_MANIFEST_URL = "/generated/current/manifest.json";

export function useSlidesData(): SlidesDataResult {
  const [deckTitle, setDeckTitle] = useState("Generated deck");
  const [slides, setSlides] = useState<SlideModel[]>([]);
  const [sourceLabel, setSourceLabel] = useState("Generated deck");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

        setDeckTitle(importedDeck.manifest.topic || "Generated deck");
        setSlides(importedDeck.slides);
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
    };
  }, []);

  return { deckTitle, slides, sourceLabel, errorMessage, isLoading };
}
