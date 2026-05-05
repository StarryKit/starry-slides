import type { LucideIcon } from "lucide-react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import type { ElementToolSubgroup } from "../lib/element-tool-model";
import { editorMotionClassName, editorPanelEnterClassName } from "../lib/motion";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

export function ToolbarTrigger({
  children,
  active = false,
  label,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  label: string;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      className={cn(
        "h-8 w-8 rounded-md text-foreground/60 hover:text-foreground",
        active && "bg-foreground/[0.06] text-foreground"
      )}
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function IconButton({
  children,
  active = false,
  label,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      className={cn(
        "h-8 w-8 rounded-md text-foreground/60 hover:text-foreground",
        active && "bg-foreground/[0.06] text-foreground"
      )}
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function ToolbarPanel({
  children,
  left,
  width = "default",
}: {
  children: ReactNode;
  left: number;
  width?: "default" | "medium" | "wide";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const rect = panel.getBoundingClientRect();
    const toolbar = panel.closest('[data-testid="floating-toolbar-anchor"]');
    const toolbarRect = toolbar instanceof HTMLElement ? toolbar.getBoundingClientRect() : null;
    const baseLeft = toolbarRect ? toolbarRect.left + left : rect.left - offset.x;
    const baseTop = toolbarRect ? toolbarRect.bottom + 8 : rect.top - offset.y;
    const baseRect = {
      bottom: baseTop + rect.height,
      left: baseLeft,
      right: baseLeft + rect.width,
      top: baseTop,
    };
    const viewportPadding = 16;
    let nextX = 0;
    let nextY = 0;

    if (baseRect.right > window.innerWidth - viewportPadding) {
      nextX = window.innerWidth - viewportPadding - baseRect.right;
    }
    if (baseRect.left + nextX < viewportPadding) {
      nextX += viewportPadding - (baseRect.left + nextX);
    }
    if (baseRect.bottom > window.innerHeight - viewportPadding) {
      nextY = window.innerHeight - viewportPadding - baseRect.bottom;
    }
    if (baseRect.top + nextY < viewportPadding) {
      nextY += viewportPadding - (baseRect.top + nextY);
    }

    if (shouldUpdateOffset(offset.x, nextX) || shouldUpdateOffset(offset.y, nextY)) {
      setOffset({ x: nextX, y: nextY });
    }
  }, [left, offset.x, offset.y]);

  const widthClassName =
    width === "wide"
      ? "w-80 max-w-[min(320px,calc(100vw-40px))] max-h-[calc(100vh-36px)] overflow-y-auto"
      : width === "medium"
        ? "w-[272px]"
        : "w-64";

  return (
    <div
      className={cn(
        "absolute z-50 grid gap-1.5 rounded-md border border-foreground/[0.08] bg-white p-1.5 text-popover-foreground shadow-[0_4px_20px_rgba(0,0,0,0.06),0_12px_40px_rgba(0,0,0,0.08)] max-[1200px]:max-w-[calc(100vw-40px)]",
        editorMotionClassName,
        editorPanelEnterClassName,
        widthClassName
      )}
      ref={panelRef}
      style={{ left: left + offset.x, top: `calc(100% + 8px + ${offset.y}px)` }}
      role="menu"
    >
      {children}
    </div>
  );
}

export function getPanelWidth(subgroup: ElementToolSubgroup): "default" | "medium" | "wide" {
  if (subgroup.features.some((feature) => feature.controlType === "color")) {
    return "wide";
  }
  if (subgroup.features.some((feature) => feature.controlType === "action-group")) {
    return "medium";
  }
  return "default";
}

export function shouldUpdateOffset(current: number, next: number) {
  return Math.abs(current - next) >= 0.5;
}

export function Divider() {
  return <Separator orientation="vertical" className="mx-1 h-4 bg-foreground/10" />;
}

export function PanelTitle({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium uppercase leading-tight tracking-wider text-foreground/40">
      {children}
    </div>
  );
}

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[10px] font-medium uppercase tracking-wider text-foreground/50"
    >
      {children}
    </label>
  );
}

export function ToolbarIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon className="size-3.5" />;
}

export function ToolbarOption({
  children,
  onClick,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <Button
      variant="ghost"
      className="min-h-8 w-full justify-start gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-normal text-foreground/70 hover:text-foreground"
      type="button"
      title={title}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
