import {
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  type LucideIcon,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useState } from "react";
import type { SlideModel } from "../../core";
import { cn } from "../lib/utils";

interface SlideSidebarProps {
  slides: SlideModel[];
  activeSlideId: string;
  slideCount: number;
  thumbnails: Record<string, string>;
  onSelectSlide: (slideId: string) => void;
  onAdd?: () => void;
  onDuplicate?: (slideId: string) => void;
  onDelete?: (slideId: string) => void;
  onToggleHidden?: (slideId: string) => void;
  onReorder?: (slideId: string, targetIndex: number) => void;
}

interface MenuItemProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

function SlideSidebar({
  slides,
  activeSlideId,
  slideCount,
  thumbnails,
  onSelectSlide,
  onAdd,
  onDuplicate,
  onDelete,
  onToggleHidden,
  onReorder,
}: SlideSidebarProps) {
  const [menuId, setMenuId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const activeSlideRef = useCallback((node: HTMLButtonElement | null) => {
    node?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, []);

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

            return (
              <div
                key={slide.id}
                draggable
                onDragStart={(event) => {
                  setDraggingId(slide.id);
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
                  const draggedSlideId = event.dataTransfer.getData("text/plain") || draggingId;
                  if (draggedSlideId && draggedSlideId !== slide.id) {
                    onReorder?.(draggedSlideId, index);
                  }
                  setDraggingId(null);
                  setDropIndex(null);
                }}
                onDragEnd={() => {
                  setDraggingId(null);
                  setDropIndex(null);
                }}
                onMouseEnter={() => setHoverId(slide.id)}
                onMouseLeave={() => {
                  setHoverId(null);
                  if (menuId === slide.id) {
                    setMenuId(null);
                  }
                }}
                className={cn(
                  "group flex items-stretch gap-1.5 rounded-lg",
                  dropIndex === index && draggingId !== slide.id && "bg-foreground/[0.04]"
                )}
                data-testid="slide-card"
              >
                <div
                  className={cn(
                    "flex w-5 items-start justify-center pt-2 text-[11px] font-semibold tabular-nums transition-colors",
                    active ? "text-foreground" : "text-foreground/55 group-hover:text-foreground/75"
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
                      : "ring-foreground/[0.08] hover:ring-foreground/20",
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

                <div
                  className={cn(
                    "flex w-5 flex-col items-center justify-start gap-0.5 pt-1.5 opacity-0 transition-opacity",
                    (hoverId === slide.id || menuId === slide.id) && "opacity-100"
                  )}
                >
                  <button
                    className="flex size-5 cursor-grab items-center justify-center rounded text-foreground/40 hover:bg-foreground/[0.06] hover:text-foreground/80"
                    title="Drag to reorder"
                    type="button"
                    draggable
                    onDragStart={(event) => {
                      setDraggingId(slide.id);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", slide.id);
                    }}
                  >
                    <GripVertical className="size-3" />
                  </button>
                  <div className="relative">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setMenuId(menuId === slide.id ? null : slide.id);
                      }}
                      className="flex size-5 items-center justify-center rounded text-foreground/40 hover:bg-foreground/[0.06] hover:text-foreground/80"
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={menuId === slide.id}
                    >
                      <MoreHorizontal className="size-3" />
                    </button>

                    {menuId === slide.id ? (
                      <div className="absolute right-0 z-50 mt-1 w-32 animate-fade-in rounded-lg border border-foreground/[0.08] bg-white p-1 shadow-[0_4px_20px_rgba(0,0,0,0.06),0_12px_40px_rgba(0,0,0,0.08)]">
                        <MenuItem
                          icon={Copy}
                          label="Duplicate"
                          onClick={() => {
                            onDuplicate?.(slide.id);
                            setMenuId(null);
                          }}
                        />
                        <MenuItem
                          icon={hidden ? Eye : EyeOff}
                          label={hidden ? "Show" : "Hide"}
                          onClick={() => {
                            onToggleHidden?.(slide.id);
                            setMenuId(null);
                          }}
                        />
                        <MenuItem
                          icon={Trash2}
                          label="Delete"
                          danger
                          disabled={slides.length <= 1}
                          onClick={() => {
                            onDelete?.(slide.id);
                            setMenuId(null);
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger, disabled }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] transition-colors",
        danger
          ? "text-foreground/70 hover:bg-destructive/10 hover:text-destructive"
          : "text-foreground/70 hover:bg-foreground/[0.04] hover:text-foreground",
        disabled && "pointer-events-none opacity-40"
      )}
      disabled={disabled}
      type="button"
    >
      <Icon className="size-3" />
      <span>{label}</span>
    </button>
  );
}

export { SlideSidebar };
