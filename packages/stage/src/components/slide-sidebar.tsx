import type { SlideModel } from "@html-slides-editor/core";

interface SlideSidebarProps {
  slides: SlideModel[];
  activeSlideId: string;
  thumbnails: Record<string, string>;
  onSelectSlide: (slideId: string) => void;
}

function SlideSidebar({ slides, activeSlideId, thumbnails, onSelectSlide }: SlideSidebarProps) {
  return (
    <aside className="hse-sidebar">
      <div className="hse-slide-list">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            className={slide.id === activeSlideId ? "hse-slide-card is-active" : "hse-slide-card"}
            onClick={() => onSelectSlide(slide.id)}
            type="button"
            aria-label={`Slide ${index + 1}`}
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
    </aside>
  );
}

export { SlideSidebar };
