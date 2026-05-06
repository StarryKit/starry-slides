import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { cn } from "../lib/utils";
import { editorMotionFastClassName, editorPanelEnterClassName } from "../lib/motion";

type SeparatorItem = { kind: "separator" };
type ActionItem = {
  kind: "action";
  label: string;
  shortcut?: string;
  action: () => void;
  disabled?: boolean;
};
type ContextMenuItem = SeparatorItem | ActionItem;

interface ContextMenuProps {
  stageViewportRef: RefObject<HTMLDivElement | null>;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  hasSelection: boolean;
  hasMultipleSelection: boolean;
  isEditingText: boolean;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSelectAll: () => void;
  onLayerOrder: (action: string) => void;
  onGroup: () => void;
}

const MENU_ITEM_CLASS = cn(
  "flex w-full items-center gap-3 rounded-[5px] px-3 py-1.5 text-left text-[13px] leading-relaxed",
  "text-foreground/85 hover:bg-foreground/[0.06] hover:text-foreground",
  "disabled:pointer-events-none disabled:text-foreground/25",
  "outline-hidden",
  editorMotionFastClassName,
  "motion-safe:transition-[background-color,color]"
);

const MENU_SHORTCUT_CLASS = "ml-auto text-[11px] text-foreground/35 tabular-nums";

function ContextMenu({
  stageViewportRef,
  iframeRef,
  hasSelection,
  hasMultipleSelection,
  isEditingText,
  onCut,
  onCopy,
  onPaste,
  onDelete,
  onDuplicate,
  onSelectAll,
  onLayerOrder,
  onGroup,
}: ContextMenuProps) {
  const [state, setState] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closedByEscapeRef = useRef(false);

  const close = useCallback(() => {
    setState(null);
  }, []);

  // Position the menu, ensuring it stays within the viewport
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu || !state) {
      return;
    }

    const rect = menu.getBoundingClientRect();
    const viewportPadding = 8;
    let adjustedX = state.x;
    let adjustedY = state.y;

    if (rect.right > window.innerWidth - viewportPadding) {
      adjustedX -= rect.width;
    }

    if (rect.bottom > window.innerHeight - viewportPadding) {
      adjustedY -= rect.height;
    }

    if (adjustedX < viewportPadding) {
      adjustedX = viewportPadding;
    }

    if (adjustedY < viewportPadding) {
      adjustedY = viewportPadding;
    }

    if (adjustedX !== state.x || adjustedY !== state.y) {
      setState({ x: adjustedX, y: adjustedY });
    }
  }, [state]);

  // Listen for right-click on the stage viewport
  useEffect(() => {
    const viewport = stageViewportRef.current;
    if (!viewport) {
      return;
    }

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();

      const target = event.target as HTMLElement;
      // Ignore if right-clicking inside the iframe itself (handled separately)
      if (target.tagName === "IFRAME") {
        return;
      }

      setState({ x: event.clientX, y: event.clientY });
      closedByEscapeRef.current = false;
    };

    viewport.addEventListener("contextmenu", handleContextMenu);
    return () => {
      viewport.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [stageViewportRef]);

  // Close on Escape
  useEffect(() => {
    if (!state) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closedByEscapeRef.current = true;
        close();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [state, close]);

  // Close on outside click or scroll
  useEffect(() => {
    if (!state) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (closedByEscapeRef.current) {
        closedByEscapeRef.current = false;
        return;
      }

      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }

      close();
    };

    const handleScroll = () => {
      close();
    };

    // Use a small delay to avoid the same right-click that opened the menu
    // from immediately closing it via the window-level mousedown.
    const timeoutId = window.setTimeout(() => {
      document.addEventListener("mousedown", handlePointerDown);
      window.addEventListener("scroll", handleScroll, { capture: true });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, [state, close]);

  if (!state) {
    return null;
  }

  const items: ContextMenuItem[] = buildMenuItems({
    hasSelection,
    hasMultipleSelection,
    isEditingText,
    onCut,
    onCopy,
    onPaste,
    onDelete,
    onDuplicate,
    onSelectAll,
    onLayerOrder,
    onGroup,
    close,
  });

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Context menu"
      className={cn(
        "fixed z-50 min-w-[180px] max-w-[260px] rounded-lg border border-foreground/[0.08] bg-white p-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)]",
        editorMotionFastClassName,
        editorPanelEnterClassName
      )}
      style={{
        left: state.x,
        top: state.y,
      }}
    >
      {items.map((item, index) => {
        if (item.kind === "separator") {
          return (
            <div
              key={`sep-${index}`}
              className="mx-2 my-1 h-px bg-foreground/[0.06]"
            />
          );
        }

        return (
          <button
            key={`${item.label}-${index}`}
            type="button"
            role="menuitem"
            className={MENU_ITEM_CLASS}
            disabled={item.disabled}
            onClick={() => {
              item.action();
              close();
            }}
          >
            <span>{item.label}</span>
            {item.shortcut ? (
              <span className={MENU_SHORTCUT_CLASS}>{item.shortcut}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function buildMenuItems({
  hasSelection,
  hasMultipleSelection,
  isEditingText,
  onCut,
  onCopy,
  onPaste,
  onDelete,
  onDuplicate,
  onSelectAll,
  onLayerOrder,
  onGroup,
  close,
}: {
  hasSelection: boolean;
  hasMultipleSelection: boolean;
  isEditingText: boolean;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSelectAll: () => void;
  onLayerOrder: (action: string) => void;
  onGroup: () => void;
  close: () => void;
}): ContextMenuItem[] {
  const items: ContextMenuItem[] = [];

  if (hasSelection || isEditingText) {
    // Cut / Copy / Paste / Delete / Duplicate
    items.push({ kind: "action", label: "Cut", shortcut: "⌘X", action: onCut });
    items.push({ kind: "action", label: "Copy", shortcut: "⌘C", action: onCopy });

    if (hasSelection && !isEditingText) {
      items.push({
        kind: "action",
        label: "Duplicate Element",
        shortcut: "⌘D",
        action: onDuplicate,
        disabled: hasMultipleSelection,
      });
      items.push({ kind: "separator" });
      items.push({ kind: "action", label: "Delete", shortcut: "⌫", action: onDelete });
      items.push({ kind: "separator" });
    } else if (isEditingText) {
      items.push({ kind: "separator" });
      items.push({
        kind: "action",
        label: "Select All",
        shortcut: "⌘A",
        action: onSelectAll,
      });
      return items; // text editing: only clipboard + select all
    }
  } else {
    // No selection / blank area
    items.push({ kind: "action", label: "Paste", shortcut: "⌘V", action: onPaste });
    items.push({
      kind: "action",
      label: "Select All",
      shortcut: "⌘A",
      action: onSelectAll,
    });
  }

  // Layer order operations (always available when element selected)
  if (hasSelection && !isEditingText) {
    items.push({
      kind: "action",
      label: "Bring to Front",
      shortcut: "⌘⇧]",
      action: () => onLayerOrder("front"),
    });
    items.push({
      kind: "action",
      label: "Bring Forward",
      shortcut: "⌘]",
      action: () => onLayerOrder("forward"),
    });
    items.push({
      kind: "action",
      label: "Send Backward",
      shortcut: "⌘[",
      action: () => onLayerOrder("backward"),
    });
    items.push({
      kind: "action",
      label: "Send to Back",
      shortcut: "⌘⇧[",
      action: () => onLayerOrder("back"),
    });

    // Group placeholder
    if (hasMultipleSelection) {
      items.push({ kind: "separator" });
      items.push({
        kind: "action",
        label: "Group",
        shortcut: "⌘G",
        action: onGroup,
      });
    }
  }

  return items;
}

export { ContextMenu };
