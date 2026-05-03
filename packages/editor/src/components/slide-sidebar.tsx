import type { SlideModel } from "@starry-slides/core";
import { useCallback } from "react";
import { cn } from "../lib/utils";
import { ScrollArea } from "./ui/scroll-area";

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
    <aside
      className="group/sidebar relative flex min-h-0 min-w-0 basis-[132px] items-stretch justify-start overflow-hidden bg-transparent p-3.5 transition-[flex-basis,width,opacity] duration-200 ease-out after:absolute after:inset-y-1.5 after:right-0 after:w-px after:bg-border hover:basis-[272px] focus-within:basis-[272px] max-[1200px]:basis-auto max-[1200px]:p-0 max-[1200px]:pb-2.5 max-[1200px]:after:inset-x-0 max-[1200px]:after:inset-y-auto max-[1200px]:after:bottom-0 max-[1200px]:after:h-px max-[1200px]:after:w-auto"
      data-testid="slide-sidebar"
    >
      <div
        className="flex h-full min-h-0 w-full min-w-0 flex-col gap-2.5"
        data-testid="slide-sidebar-panel"
      >
        <div className="flex min-h-7 items-center pt-1">
          <span
            className="inline-block text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
            data-testid="slide-count"
          >
            {slideCount} slide{slideCount === 1 ? "" : "s"}
          </span>
        </div>
        <ScrollArea
          className="min-h-0 flex-1 overflow-hidden pt-2 [mask-image:linear-gradient(to_bottom,transparent_0,black_18px,black_calc(100%_-_18px),transparent_100%)]"
          data-testid="slide-list"
        >
          <div className="grid content-start gap-2.5 pr-2 transition-[gap] duration-150 group-[:not(:hover):not(:focus-within)]/sidebar:gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                ref={slide.id === activeSlideId ? activeSlideRef : null}
                className={cn(
                  "grid w-full cursor-pointer gap-2 border-0 bg-transparent p-0 text-left opacity-100 transition-opacity duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  slide.id !== activeSlideId &&
                    "group-[:not(:hover):not(:focus-within)]/sidebar:opacity-90"
                )}
                onClick={() => onSelectSlide(slide.id)}
                type="button"
                aria-label={`Slide ${index + 1}`}
                aria-current={slide.id === activeSlideId ? "true" : undefined}
                data-testid="slide-card"
              >
                <div
                  className={cn(
                    "relative aspect-video w-full overflow-hidden rounded-[14px] border-2 border-transparent bg-transparent transition-[border-color,box-shadow,border-radius] duration-150 group-[:not(:hover):not(:focus-within)]/sidebar:rounded-xl",
                    slide.id === activeSlideId &&
                      "border-primary shadow-[0_0_0_1px_rgba(255,250,243,0.92)]"
                  )}
                  data-testid="slide-thumbnail"
                >
                  {thumbnails[slide.id] ? (
                    <img
                      alt={`Slide ${index + 1}`}
                      className={cn(
                        "block size-full bg-transparent object-cover",
                        slide.id === activeSlideId && "shadow-[inset_0_0_0_2px_var(--primary)]"
                      )}
                      src={thumbnails[slide.id]}
                    />
                  ) : (
                    <div
                      className={cn(
                        "grid size-full place-items-center bg-gradient-to-br from-card/80 to-card/40",
                        slide.id === activeSlideId && "shadow-[inset_0_0_0_2px_var(--primary)]"
                      )}
                      aria-hidden="true"
                    >
                      <span className="size-[18px] animate-spin rounded-full border-[1.5px] border-foreground/15 border-t-foreground/45" />
                    </div>
                  )}
                  <span className="pointer-events-none absolute right-2.5 top-2.5 rounded-full bg-foreground/60 px-2 py-1 text-[11px] uppercase tracking-[0.08em] text-background opacity-0 transition-opacity duration-150 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100">
                    {index + 1}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
}

export { SlideSidebar };
