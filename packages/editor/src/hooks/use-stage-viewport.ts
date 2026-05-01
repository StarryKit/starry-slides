import type { RefObject } from "react";
import { useEffect, useState } from "react";

interface UseStageViewportOptions {
  stageViewportRef: RefObject<HTMLDivElement | null>;
  slideWidth: number;
  slideHeight: number;
}

interface StageViewportResult {
  offsetX: number;
  offsetY: number;
  scale: number;
}

function useStageViewport({
  stageViewportRef,
  slideWidth,
  slideHeight,
}: UseStageViewportOptions): StageViewportResult {
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const viewport = stageViewportRef.current;
    if (!viewport) {
      return;
    }

    const updateViewport = () => {
      const rect = viewport.getBoundingClientRect();
      setViewportSize({ width: rect.width, height: rect.height });
    };

    updateViewport();

    const observer = new ResizeObserver(() => {
      updateViewport();
    });
    observer.observe(viewport);

    return () => {
      observer.disconnect();
    };
  }, [stageViewportRef]);

  const rawScale = Math.min(
    viewportSize.width > 0 ? viewportSize.width / slideWidth : 1,
    viewportSize.height > 0 ? viewportSize.height / slideHeight : 1
  );
  const scale = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1;
  const scaledWidth = slideWidth * scale;
  const scaledHeight = slideHeight * scale;

  return {
    scale,
    offsetX: Math.max((viewportSize.width - scaledWidth) / 2, 0),
    offsetY: Math.max((viewportSize.height - scaledHeight) / 2, 0),
  };
}

export { useStageViewport };
