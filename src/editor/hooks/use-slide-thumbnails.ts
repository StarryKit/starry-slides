import { useEffect, useMemo, useRef, useState } from "react";
import type { SlideModel } from "../../core";
import { renderSlideThumbnail } from "../lib/thumbnail-renderer";

const DEBOUNCE_MS = 300;

export function useSlideThumbnails(slides: SlideModel[]) {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const cacheRef = useRef(new Map<string, string>());

  const cacheKeys = useMemo(
    () =>
      slides.map((slide) => ({
        id: slide.id,
        key: `${slide.id}:${slide.htmlSource}`,
      })),
    [slides]
  );

  useEffect(() => {
    let cancelled = false;

    const timeoutId = window.setTimeout(async () => {
      const nextThumbnails: Record<string, string> = {};

      for (const slide of slides) {
        const cacheKey = `${slide.id}:${slide.htmlSource}`;
        const cached = cacheRef.current.get(cacheKey);

        if (cached) {
          nextThumbnails[slide.id] = cached;
          continue;
        }

        try {
          const thumbnail = await renderSlideThumbnail(slide);
          cacheRef.current.set(cacheKey, thumbnail);
          nextThumbnails[slide.id] = thumbnail;
        } catch {
          // Ignore thumbnail failures and keep the app responsive.
        }

        if (cancelled) {
          return;
        }
      }

      if (!cancelled) {
        setThumbnails((current) => ({ ...current, ...nextThumbnails }));
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [slides]);

  useEffect(() => {
    const validKeys = new Set(cacheKeys.map((item) => item.key));

    for (const key of cacheRef.current.keys()) {
      if (!validKeys.has(key)) {
        cacheRef.current.delete(key);
      }
    }
  }, [cacheKeys]);

  return thumbnails;
}
