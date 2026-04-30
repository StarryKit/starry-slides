import { type SlideModel, parseSlide, sampleSlides } from "@html-slides-editor/core";
import { useEffect, useState } from "react";

export function useSlidesData() {
  const [slides, setSlides] = useState<SlideModel[]>(sampleSlides);
  const [sourceLabel, setSourceLabel] = useState("Built-in sample slides");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("deck") === "sample") {
      return;
    }

    let cancelled = false;

    async function loadGeneratedSlides() {
      try {
        const manifestResponse = await fetch("/generated/current/manifest.json", {
          cache: "no-store",
        });
        if (!manifestResponse.ok) {
          return;
        }

        const manifest = (await manifestResponse.json()) as {
          topic?: string;
          slides?: Array<{ file: string; title?: string }>;
        };

        if (!manifest.slides?.length) {
          return;
        }

        const resolvedSlides = await Promise.all(
          manifest.slides.map(async (slide, index) => {
            const slideResponse = await fetch(`/generated/current/${slide.file}`, {
              cache: "no-store",
            });
            const html = await slideResponse.text();
            const parsed = parseSlide(html, `generated-slide-${index + 1}`);

            return {
              ...parsed,
              title: slide.title || parsed.title,
            };
          })
        );

        if (!cancelled) {
          setSlides(resolvedSlides);
          setSourceLabel(
            manifest.topic
              ? `Generated deck: ${manifest.topic}`
              : "Generated deck from skills/html-slides-generator"
          );
        }
      } catch {
        // Fall back to the built-in sample deck when no generated slides exist yet.
      }
    }

    loadGeneratedSlides();

    return () => {
      cancelled = true;
    };
  }, []);

  return { slides, sourceLabel };
}

export type { SlideModel } from "@html-slides-editor/core";
