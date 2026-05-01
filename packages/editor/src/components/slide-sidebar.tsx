import type { SlideModel } from "@html-slides-editor/core";
import { useCallback } from "react";

interface SlideSidebarProps {
  slides: SlideModel[];
  activeSlideId: string;
  slideCount: number;
  thumbnails: Record<string, string>;
  onSelectSlide: (slideId: string) => void;
}

function SlideSidebar({
  slides,
  activeSlideId,
  slideCount,
  thumbnails,
  onSelectSlide,
}: SlideSidebarProps) {
  const activeSlideRef = useCallback((node: HTMLButtonElement | null) => {
    node?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, []);

  return (
    <aside className="hse-sidebar" data-testid="slide-sidebar">
      <div className="hse-sidebar-panel" data-testid="slide-sidebar-panel">
        <div className="hse-sidebar-header">
          <span className="hse-sidebar-count" data-testid="slide-count">
            {slideCount} slide{slideCount === 1 ? "" : "s"}
          </span>
        </div>
        <div className="hse-slide-list" data-testid="slide-list">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              ref={slide.id === activeSlideId ? activeSlideRef : null}
              className={slide.id === activeSlideId ? "hse-slide-card is-active" : "hse-slide-card"}
              onClick={() => onSelectSlide(slide.id)}
              type="button"
              aria-label={`Slide ${index + 1}`}
              data-testid="slide-card"
            >
              <div className="hse-slide-thumb">
                {thumbnails[slide.id] ? (
                  <img
                    alt={`Slide ${index + 1}`}
                    className="hse-slide-thumb-image"
                    src={thumbnails[slide.id]}
                  />
                ) : (
                  <div className="hse-slide-thumb-placeholder" aria-hidden="true">
                    <span className="hse-slide-thumb-spinner" />
                  </div>
                )}
                <span className="hse-slide-number">{index + 1}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

export { SlideSidebar };
