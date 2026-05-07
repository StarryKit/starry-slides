import { Copy, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import type { SlideModel } from "../../core";
import { cn } from "../lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "./ui/context-menu";

interface SlideSidebarProps {
  slides: SlideModel[];
  activeSlideId: string;
  slideCount: number;
  thumbnails: Record<string, string>;
  onSelectSlide: (slideId: string) => void;
  onAdd?: () => void;
  onAddSlideAbove?: (slideId: string) => void;
  onAddSlideBelow?: (slideId: string) => void;
  onDuplicate?: (slideId: string) => void;
  onDelete?: (slideId: string) => void;
  onToggleHidden?: (slideId: string) => void;
  onReorder?: (slideId: string, targetIndex: number) => void;
}

function SlideSidebar({
  slides,
  activeSlideId,
  slideCount,
  thumbnails,
  onSelectSlide,
  onAdd,
  onAddSlideAbove,
  onAddSlideBelow,
  onDuplicate,
  onDelete,
  onToggleHidden,
  onReorder,
}: SlideSidebarProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const draggingIndex = draggingId ? slides.findIndex((slide) => slide.id === draggingId) : -1;

  const activeSlideRef = useCallback((node: HTMLButtonElement | null) => {
    node?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, []);
  const finishReorder = useCallback(
    (draggedSlideId: string | null, targetIndex: number | null) => {
      if (!draggedSlideId || targetIndex === null) {
        setDraggingId(null);
        setDropIndex(null);
        return;
      }

      const fromIndex = slides.findIndex((item) => item.id === draggedSlideId);
      if (fromIndex >= 0 && fromIndex !== targetIndex) {
        onReorder?.(draggedSlideId, targetIndex);
      }

      setDraggingId(null);
      setDropIndex(null);
    },
    [onReorder, slides]
  );

  return (
    <aside
      className="flex h-[calc(100vh-3.5rem)] w-[212px] shrink-0 flex-col border-r border-foreground/[0.06] bg-white"
      data-testid="slide-sidebar"
    >
      <div
        className="flex h-full min-h-0 w-full min-w-0 flex-col"
        data-testid="slide-sidebar-panel"
      >
        <div className="flex h-10 items-center justify-between border-b border-foreground/[0.06] px-3">
          <div
            className="text-[11px] font-medium uppercase tracking-wider text-foreground/50"
            data-testid="slide-count"
          >
            <span className="tabular-nums">{slideCount}</span> slides
          </div>
          <button
            onClick={onAdd}
            className="flex size-7 items-center justify-center rounded-md text-foreground/50 transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            type="button"
            title="Add slide"
            aria-label="Add slide"
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        <div
          className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-2 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          data-testid="slide-list"
        >
          {slides.map((slide, index) => {
            const active = slide.id === activeSlideId;
            const hidden = slide.hidden === true;
            const isDragging = slide.id === draggingId;
            const showInsertionBefore =
              draggingIndex >= 0 &&
              dropIndex === index &&
              index < draggingIndex &&
              draggingId !== slide.id;
            const showInsertionAfter =
              draggingIndex >= 0 &&
              dropIndex === index &&
              index > draggingIndex &&
              draggingId !== slide.id;

            return (
              <ContextMenu key={slide.id}>
                <ContextMenuTrigger asChild>
                  <div
                    draggable
                    onDragStart={(event) => {
                      setDraggingId(slide.id);
                      setDropIndex(index);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", slide.id);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDropIndex(index);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      const draggedSlideId = event.dataTransfer.getData("text/plain") || draggingId;
                      finishReorder(draggedSlideId, index);
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDropIndex(null);
                    }}
                    className={cn(
                      "group relative flex cursor-grab items-stretch gap-1.5 rounded-lg active:cursor-grabbing",
                      isDragging && "opacity-60"
                    )}
                    data-testid="slide-card"
                  >
                    {showInsertionBefore ? <InsertionMarker /> : null}
                    <div
                      className={cn(
                        "flex w-5 items-start justify-center pt-2 text-[11px] font-semibold tabular-nums transition-colors",
                        active
                          ? "text-foreground"
                          : "text-foreground/55 group-hover:text-foreground/75"
                      )}
                    >
                      {index + 1}
                    </div>

                    <button
                      ref={active ? activeSlideRef : null}
                      className={cn(
                        "relative flex-1 overflow-hidden rounded-lg text-left ring-1 ring-inset transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        active
                          ? "shadow-[0_0_0_2px_var(--background),0_0_0_3px_var(--foreground)] ring-foreground"
                          : "ring-foreground/30 shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.04)] hover:ring-foreground/45",
                        hidden && "opacity-40"
                      )}
                      onClick={() => onSelectSlide(slide.id)}
                      type="button"
                      aria-label={`Slide ${index + 1}`}
                      aria-current={active ? "true" : undefined}
                    >
                      <div
                        className="relative aspect-[16/9] w-full bg-white"
                        data-testid="slide-thumbnail"
                      >
                        {thumbnails[slide.id] ? (
                          <img
                            alt={`Slide ${index + 1}`}
                            className="absolute inset-0 block size-full object-cover"
                            src={thumbnails[slide.id]}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-foreground/20">
                            Slide {index + 1}
                          </div>
                        )}

                        {hidden ? (
                          <div
                            className="absolute left-1 top-1 flex size-4 items-center justify-center rounded bg-foreground/80 text-background"
                            data-testid="slide-hidden-indicator"
                          >
                            <EyeOff className="size-2.5" />
                          </div>
                        ) : null}
                      </div>

                      {slide.title ? (
                        <div className="truncate border-t border-foreground/[0.04] bg-white px-2 py-1 text-[11px] text-foreground/60">
                          {slide.title}
                        </div>
                      ) : null}
                    </button>
                    {showInsertionAfter ? <InsertionMarker position="after" /> : null}
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent aria-label="Slide actions" className="min-w-36">
                  <ContextMenuItem onSelect={() => onAddSlideAbove?.(slide.id)}>
                    <Plus className="size-3.5" />
                    Add Slide Above
                  </ContextMenuItem>
                  <ContextMenuItem onSelect={() => onAddSlideBelow?.(slide.id)}>
                    <Plus className="size-3.5" />
                    Add Slide Below
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onSelect={() => onDuplicate?.(slide.id)}>
                    <Copy className="size-3.5" />
                    Duplicate
                  </ContextMenuItem>
                  <ContextMenuItem onSelect={() => onToggleHidden?.(slide.id)}>
                    {hidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                    {hidden ? "Show" : "Hide"}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    disabled={slides.length <= 1}
                    variant="destructive"
                    onSelect={() => onDelete?.(slide.id)}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function InsertionMarker({ position = "before" }: { position?: "before" | "after" }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute left-6 right-1 z-10 flex h-3 items-center",
        position === "before" ? "-top-[11px]" : "-bottom-[11px]"
      )}
      data-testid="slide-insertion-marker"
    >
      <span className="size-2 rounded-full bg-foreground/55" />
      <span className="h-0.5 flex-1 rounded-full bg-foreground/55" />
    </div>
  );
}

export { SlideSidebar };
