import {
  composeTransform,
  parseTransformParts,
  type StageRect,
} from "@starry-slides/core";
import {
  AlignCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignLeft,
  AlignRight,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowDownToLine,
  ArrowUpToLine,
  Bold,
  ChevronDown,
  ChevronUp,
  Italic,
  Layers,
  type LucideIcon,
  Minus,
  Plus,
  Strikethrough,
  Trash2,
  Type,
  Underline,
} from "lucide-react";
import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { CssPropertyRow } from "../lib/collect-css-properties";
import {
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_OPTIONS,
  type TextAlign,
  getColorInputValue,
  getFontFamilyLabel,
  getStyleValue,
  isBoldFontWeight,
  isFontFamilySelected,
  parsePixelValue,
  parseTextDecorationLines,
} from "../lib/style-controls";
import { cn } from "../lib/utils";
import { ColorPicker } from "./color-picker";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";

const TOOLBAR_FADE_MS = 140;

type MenuId = "font" | "size" | "color" | "align" | "arrange" | "layer";

interface FloatingToolbarProps {
  inspectedStyles: CssPropertyRow[];
  inlineStyleValues: Record<string, string>;
  selectionOverlay: StageRect;
  scale: number;
  offsetX: number;
  offsetY: number;
  slideWidth: number;
  slideHeight: number;
  onStyleChange: (propertyName: string, nextValue: string) => void;
  onDelete: () => void;
}

const ALIGN_OPTIONS: Array<{ value: TextAlign; icon: LucideIcon; label: string }> = [
  { value: "left", icon: AlignLeft, label: "Left" },
  { value: "center", icon: AlignCenter, label: "Center" },
  { value: "right", icon: AlignRight, label: "Right" },
];
const ARRANGE_OPTIONS: Array<{ value: string; icon: LucideIcon; label: string }> = [
  { value: "left", icon: AlignStartHorizontal, label: "Align left" },
  { value: "hcenter", icon: AlignCenterHorizontal, label: "Align horizontal center" },
  { value: "right", icon: AlignEndHorizontal, label: "Align right" },
  { value: "top", icon: AlignStartVertical, label: "Align top" },
  { value: "vcenter", icon: AlignCenterVertical, label: "Align vertical center" },
  { value: "bottom", icon: AlignEndVertical, label: "Align bottom" },
];
const LAYER_OPTIONS: Array<{ value: string; icon: LucideIcon; label: string }> = [
  { value: "front", icon: ArrowUpToLine, label: "Bring to front" },
  { value: "forward", icon: ChevronUp, label: "Bring forward" },
  { value: "backward", icon: ChevronDown, label: "Send backward" },
  { value: "back", icon: ArrowDownToLine, label: "Send to back" },
];
function FloatingToolbar({
  inspectedStyles,
  inlineStyleValues,
  selectionOverlay,
  scale,
  offsetX,
  offsetY,
  slideWidth,
  slideHeight,
  onStyleChange,
  onDelete,
}: FloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const sizeInputRef = useRef<HTMLInputElement>(null);
  const [activeMenu, setActiveMenu] = useState<MenuId | null>(null);
  const [panelLeft, setPanelLeft] = useState(0);
  const [toolbarOffsetX, setToolbarOffsetX] = useState(0);
  const fontFamily = getStyleValue(inspectedStyles, "font-family");
  const fontSize = Math.round(parsePixelValue(getStyleValue(inspectedStyles, "font-size"), 24));
  const textColor = getColorInputValue(getStyleValue(inspectedStyles, "color"));
  const textDecorationLines = parseTextDecorationLines(
    getStyleValue(inspectedStyles, "text-decoration-line")
  );
  const textAlign = normalizeTextAlign(getStyleValue(inspectedStyles, "text-align"));
  const transform = inlineStyleValues.transform || getStyleValue(inspectedStyles, "transform");
  const zIndex = inlineStyleValues.zIndex || getStyleValue(inspectedStyles, "z-index");
  const isBold = isBoldFontWeight(getStyleValue(inspectedStyles, "font-weight"));
  const isItalic = getStyleValue(inspectedStyles, "font-style").trim().toLowerCase() === "italic";
  const isUnderlined = textDecorationLines.has("underline");
  const isStruck = textDecorationLines.has("line-through");
  const fontFamilyLabel = getFontFamilyLabel(fontFamily);

  useEffect(() => {
    const node = toolbarRef.current;
    if (!node) {
      return;
    }

    node.animate(
      [
        { opacity: 0, filter: "blur(6px)" },
        { opacity: 1, filter: "blur(0px)" },
      ],
      {
        duration: TOOLBAR_FADE_MS,
        easing: "ease",
        fill: "both",
      }
    );

    return () => {
      const currentNode = toolbarRef.current;
      const stagePanel = currentNode?.closest('[data-testid="stage-panel"]');
      if (!(currentNode instanceof HTMLElement) || !(stagePanel instanceof HTMLElement)) {
        return;
      }

      const toolbarRect = currentNode.getBoundingClientRect();
      const stageRect = stagePanel.getBoundingClientRect();
      const ghost = currentNode.cloneNode(true);

      if (!(ghost instanceof HTMLElement)) {
        return;
      }

      ghost.className = cn(ghost.className, "absolute z-40 m-0 pointer-events-none");
      ghost.setAttribute("aria-hidden", "true");
      ghost.style.left = `${toolbarRect.left - stageRect.left}px`;
      ghost.style.top = `${toolbarRect.top - stageRect.top}px`;
      ghost.style.width = `${toolbarRect.width}px`;
      ghost.style.height = `${toolbarRect.height}px`;

      stagePanel.appendChild(ghost);

      const animation = ghost.animate(
        [
          { opacity: 1, filter: "blur(0px)" },
          { opacity: 0, filter: "blur(6px)" },
        ],
        {
          duration: TOOLBAR_FADE_MS,
          easing: "ease",
          fill: "forwards",
        }
      );

      void animation.finished.finally(() => {
        ghost.remove();
      });
    };
  }, []);

  useLayoutEffect(() => {
    const node = toolbarRef.current;

    if (!node) {
      return;
    }

    const rect = node.getBoundingClientRect();
    const baseLeft = rect.left - toolbarOffsetX;
    const baseRight = rect.right - toolbarOffsetX;
    const viewportPadding = 16;
    let nextOffsetX = 0;

    if (baseLeft < viewportPadding) {
      nextOffsetX = viewportPadding - baseLeft;
    }

    if (baseRight + nextOffsetX > window.innerWidth - viewportPadding) {
      nextOffsetX += window.innerWidth - viewportPadding - (baseRight + nextOffsetX);
    }

    if (shouldUpdateOffset(toolbarOffsetX, nextOffsetX)) {
      setToolbarOffsetX(nextOffsetX);
    }
  });

  useEffect(() => {
    function closeOnOutsidePointer(event: MouseEvent) {
      if (toolbarRef.current?.contains(event.target as Node)) {
        return;
      }

      setActiveMenu(null);
    }

    document.addEventListener("mousedown", closeOnOutsidePointer);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsidePointer);
    };
  }, []);

  useEffect(() => {
    if (activeMenu !== "size") {
      return;
    }

    const frame = requestAnimationFrame(() => {
      sizeInputRef.current?.focus();
      sizeInputRef.current?.select();
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [activeMenu]);

  function toggleMenu(menu: MenuId, event: ReactMouseEvent<HTMLButtonElement>) {
    setPanelLeft(event.currentTarget.offsetLeft);
    setActiveMenu((current) => (current === menu ? null : menu));
  }

  function commitTextDecoration(line: "underline" | "line-through", isActive: boolean) {
    const nextLines = new Set(textDecorationLines);
    if (isActive) {
      nextLines.delete(line);
    } else {
      nextLines.add(line);
    }

    onStyleChange(
      "text-decoration-line",
      nextLines.size > 0 ? Array.from(nextLines).join(" ") : "none"
    );
  }

  function commitFontSize(nextSize: number) {
    onStyleChange("font-size", `${Math.min(200, Math.max(8, nextSize))}px`);
  }

  function commitLayerAction(action: string) {
    const numericZIndex = Number.parseInt(zIndex, 10);
    const currentZIndex = Number.isFinite(numericZIndex) ? numericZIndex : 0;

    if (action === "front") {
      onStyleChange("z-index", "999");
      return;
    }

    if (action === "back") {
      onStyleChange("z-index", "0");
      return;
    }

    onStyleChange("z-index", String(Math.max(0, currentZIndex + (action === "forward" ? 1 : -1))));
  }

  function commitArrangeAction(action: string) {
    const slideRect = {
      x: (selectionOverlay.x - offsetX) / scale,
      y: (selectionOverlay.y - offsetY) / scale,
      width: selectionOverlay.width / scale,
      height: selectionOverlay.height / scale,
    };
    let deltaX = 0;
    let deltaY = 0;

    if (action === "left") {
      deltaX = -slideRect.x;
    } else if (action === "hcenter") {
      deltaX = slideWidth / 2 - (slideRect.x + slideRect.width / 2);
    } else if (action === "right") {
      deltaX = slideWidth - (slideRect.x + slideRect.width);
    } else if (action === "top") {
      deltaY = -slideRect.y;
    } else if (action === "vcenter") {
      deltaY = slideHeight / 2 - (slideRect.y + slideRect.height / 2);
    } else if (action === "bottom") {
      deltaY = slideHeight - (slideRect.y + slideRect.height);
    }

    if (Math.abs(deltaX) < 0.01 && Math.abs(deltaY) < 0.01) {
      return;
    }

    const transformParts = parseTransformParts(transform);
    onStyleChange(
      "transform",
      composeTransform(
        transformParts.translateX + deltaX,
        transformParts.translateY + deltaY,
        transformParts.rotate
      ) ?? ""
    );
  }

  return (
    <div
      className="relative grid w-max min-w-max max-w-[min(980px,calc(100vw-280px))] animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-1 gap-2 text-foreground pointer-events-auto max-[1200px]:w-full max-[1200px]:min-w-0"
      ref={toolbarRef}
      style={{ marginLeft: toolbarOffsetX }}
    >
      <div
        className="flex w-max items-center gap-1 overflow-x-auto overflow-y-hidden rounded-2xl border border-border bg-popover/95 px-2 py-1.5 shadow-[0_8px_24px_rgba(76,57,36,0.12),0_18px_50px_rgba(76,57,36,0.14)] backdrop-blur-md max-[1200px]:min-w-[760px]"
        aria-label="Formatting toolbar"
      >
        <ToolbarTrigger
          active={activeMenu === "font"}
          label="Font family"
          className="w-[118px] justify-start"
          onClick={(event) => {
            toggleMenu("font", event);
          }}
        >
          <span className="flex min-w-0 items-center gap-2">
            <ToolbarIcon icon={Type} />
            <span className="truncate">{fontFamilyLabel}</span>
          </span>
        </ToolbarTrigger>

        <div className="flex items-center gap-0 rounded-xl bg-muted/70">
          <IconButton
            label="Decrease font size"
            variant="ghost"
            onClick={() => {
              commitFontSize(fontSize - 2);
            }}
          >
            <ToolbarIcon icon={Minus} />
          </IconButton>
          <ToolbarTrigger
            active={activeMenu === "size"}
            label="Font size"
            className="min-w-[30px] px-1"
            onClick={(event) => {
              toggleMenu("size", event);
            }}
          >
            <span className="inline-block w-6 text-center font-bold tabular-nums">{fontSize}</span>
          </ToolbarTrigger>
          <IconButton
            label="Increase font size"
            variant="ghost"
            onClick={() => {
              commitFontSize(fontSize + 2);
            }}
          >
            <ToolbarIcon icon={Plus} />
          </IconButton>
        </div>

        <Divider />

        <IconButton
          label="Bold"
          active={isBold}
          onClick={() => {
            onStyleChange("font-weight", isBold ? "400" : "700");
          }}
        >
          <ToolbarIcon icon={Bold} />
        </IconButton>
        <IconButton
          label="Italic"
          active={isItalic}
          onClick={() => {
            onStyleChange("font-style", isItalic ? "normal" : "italic");
          }}
        >
          <ToolbarIcon icon={Italic} />
        </IconButton>
        <IconButton
          label="Underline"
          active={isUnderlined}
          onClick={() => {
            commitTextDecoration("underline", isUnderlined);
          }}
        >
          <ToolbarIcon icon={Underline} />
        </IconButton>
        <IconButton
          label="Strikethrough"
          active={isStruck}
          onClick={() => {
            commitTextDecoration("line-through", isStruck);
          }}
        >
          <ToolbarIcon icon={Strikethrough} />
        </IconButton>

        <Divider />

        <ToolbarTrigger
          active={activeMenu === "color"}
          label="Text color"
          onClick={(event) => {
            toggleMenu("color", event);
          }}
        >
          <span
            className="inline-block size-[18px] rounded-[7px] border-2 border-white shadow-[0_1px_4px_rgba(76,57,36,0.18)]"
            style={{ background: textColor }}
            aria-hidden="true"
          />
        </ToolbarTrigger>

        <ToolbarTrigger
          active={activeMenu === "align"}
          label="Text align"
          onClick={(event) => {
            toggleMenu("align", event);
          }}
        >
          <ToolbarIcon icon={getAlignIcon(textAlign)} />
        </ToolbarTrigger>

        <Divider />

        <ToolbarTrigger
          active={activeMenu === "arrange"}
          label="Arrange"
          onClick={(event) => {
            toggleMenu("arrange", event);
          }}
        >
          <ToolbarIcon icon={AlignCenterHorizontal} />
        </ToolbarTrigger>

        <ToolbarTrigger
          active={activeMenu === "layer"}
          label="Layer"
          onClick={(event) => {
            toggleMenu("layer", event);
          }}
        >
          <ToolbarIcon icon={Layers} />
        </ToolbarTrigger>

        <Divider />

        <IconButton label="Delete" variant="danger" onClick={onDelete}>
          <ToolbarIcon icon={Trash2} />
        </IconButton>
      </div>

      {activeMenu === "font" ? (
        <ToolbarPanel left={panelLeft}>
          <PanelTitle>Font</PanelTitle>
          <div className="grid gap-0.5">
            {FONT_FAMILY_OPTIONS.map((font) => (
              <ToolbarOption
                key={font.value}
                active={isFontFamilySelected(fontFamily, font.value)}
                style={{ fontFamily: font.value }}
                onClick={() => {
                  onStyleChange("font-family", font.value);
                  setActiveMenu(null);
                }}
              >
                <span>{font.label}</span>
              </ToolbarOption>
            ))}
          </div>
        </ToolbarPanel>
      ) : null}

      {activeMenu === "size" ? (
        <ToolbarPanel left={panelLeft} width="narrow">
          <PanelTitle>Font Size</PanelTitle>
          <Input
            className="h-9 rounded-[10px] bg-card/80 px-2.5 text-[13px] font-bold tabular-nums"
            ref={sizeInputRef}
            type="number"
            min={8}
            max={200}
            value={fontSize}
            onChange={(event) => {
              const nextSize = Number.parseInt(event.target.value, 10);

              if (Number.isNaN(nextSize)) {
                return;
              }

              commitFontSize(nextSize);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === "Escape") {
                setActiveMenu(null);
              }
            }}
          />
          <div className="grid gap-0.5">
            {FONT_SIZE_OPTIONS.map((size) => (
              <ToolbarOption
                key={size}
                active={fontSize === size}
                className="tabular-nums"
                onClick={() => {
                  commitFontSize(size);
                  setActiveMenu(null);
                }}
              >
                {size}
              </ToolbarOption>
            ))}
          </div>
        </ToolbarPanel>
      ) : null}

      {activeMenu === "color" ? (
        <ToolbarPanel left={panelLeft} width="wide">
          <PanelTitle>Color</PanelTitle>
          <ColorPicker
            value={textColor}
            includeGradients={false}
            onChange={(nextColor) => {
              onStyleChange("color", nextColor);
            }}
          />
        </ToolbarPanel>
      ) : null}

      {activeMenu === "align" ? (
        <ToolbarPanel left={panelLeft} width="medium">
          <PanelTitle>Text Align</PanelTitle>
          <div className="grid gap-0.5">
            {ALIGN_OPTIONS.map((option) => (
              <ToolbarOption
                key={option.value}
                active={textAlign === option.value}
                title={option.label}
                onClick={() => {
                  onStyleChange("text-align", option.value);
                  setActiveMenu(null);
                }}
              >
                <ToolbarIcon icon={option.icon} />
                <span>{option.label}</span>
              </ToolbarOption>
            ))}
          </div>
        </ToolbarPanel>
      ) : null}

      {activeMenu === "arrange" ? (
        <ToolbarPanel left={panelLeft} width="medium">
          <PanelTitle>Align</PanelTitle>
          <div className="grid grid-cols-1 gap-1.5">
            {ARRANGE_OPTIONS.map((option) => (
              <ToolbarOption
                key={option.value}
                title={option.label}
                onClick={() => {
                  commitArrangeAction(option.value);
                  setActiveMenu(null);
                }}
              >
                <ToolbarIcon icon={option.icon} />
                <span>{option.label}</span>
              </ToolbarOption>
            ))}
          </div>
        </ToolbarPanel>
      ) : null}

      {activeMenu === "layer" ? (
        <ToolbarPanel left={panelLeft} width="medium">
          <PanelTitle>Layer</PanelTitle>
          <div className="grid gap-0.5">
            {LAYER_OPTIONS.map((option) => (
              <ToolbarOption
                key={option.value}
                onClick={() => {
                  commitLayerAction(option.value);
                  setActiveMenu(null);
                }}
              >
                <ToolbarIcon icon={option.icon} />
                <span>{option.label}</span>
              </ToolbarOption>
            ))}
          </div>
        </ToolbarPanel>
      ) : null}
    </div>
  );
}

function ToolbarTrigger({
  children,
  active = false,
  className,
  label,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  className?: string;
  label?: string;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      size="sm"
      className={cn(
        "h-9 min-w-[38px] rounded-xl px-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground",
        active &&
          "bg-primary/10 text-accent-foreground shadow-[inset_0_0_0_1px_rgba(242,98,56,0.12)]",
        className
      )}
      type="button"
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function IconButton({
  children,
  active = false,
  label,
  onClick,
  variant = "default",
}: {
  children: ReactNode;
  active?: boolean;
  label: string;
  onClick?: () => void;
  variant?: "default" | "ghost" | "danger";
}) {
  return (
    <Button
      variant={active ? "default" : "ghost"}
      size="icon-sm"
      className={cn(
        "h-9 w-[34px] rounded-xl text-muted-foreground hover:text-foreground",
        active && "bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(242,98,56,0.22)]",
        variant === "danger" && "hover:bg-destructive/10 hover:text-destructive"
      )}
      type="button"
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function ToolbarPanel({
  children,
  left,
  width = "default",
}: {
  children: ReactNode;
  left: number;
  width?: "auto" | "default" | "medium" | "narrow" | "wide";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    const panel = panelRef.current;

    if (!panel) {
      return;
    }

    const rect = panel.getBoundingClientRect();
    const baseRect = {
      bottom: rect.bottom - offset.y,
      left: rect.left - offset.x,
      right: rect.right - offset.x,
      top: rect.top - offset.y,
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
  });

  const widthClassName =
    width === "narrow"
      ? "w-32"
      : width === "medium"
        ? "w-[272px]"
        : width === "wide"
          ? "w-80 max-w-[min(320px,calc(100vw-40px))] max-h-[calc(100vh-36px)] overflow-y-auto"
          : width === "auto"
            ? "w-auto"
            : "w-64";

  return (
    <div
      className={cn(
        "absolute z-50 grid gap-2 rounded-2xl border border-border bg-popover/95 p-3 text-popover-foreground shadow-[0_10px_26px_rgba(76,57,36,0.14),0_22px_54px_rgba(76,57,36,0.13)] backdrop-blur-md animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 max-[1200px]:max-w-[calc(100vw-40px)]",
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

function shouldUpdateOffset(current: number, next: number) {
  return Math.abs(current - next) >= 0.5;
}

function Divider() {
  return <Separator orientation="vertical" className="mx-0.5 h-6" />;
}

function PanelTitle({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-1 text-[11px] font-bold uppercase leading-tight tracking-[0.08em] text-muted-foreground">
      {children}
    </div>
  );
}

function getAlignIcon(align: TextAlign): LucideIcon {
  if (align === "center") {
    return AlignCenter;
  }

  if (align === "right") {
    return AlignRight;
  }

  return AlignLeft;
}

function normalizeTextAlign(value: string): TextAlign {
  if (value === "center" || value === "right") {
    return value;
  }

  return "left";
}

function ToolbarIcon({ icon: Icon }: { icon: LucideIcon; muted?: boolean }) {
  return <Icon />;
}

function ToolbarOption({
  active = false,
  children,
  className,
  onClick,
  style,
  title,
}: {
  active?: boolean;
  children: ReactNode;
  className?: string;
  onClick: () => void;
  style?: React.CSSProperties;
  title?: string;
}) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "min-h-[34px] w-full justify-start gap-2.5 rounded-[10px] px-2.5 py-1.5 text-left text-[13px] font-normal text-muted-foreground hover:text-foreground",
        active && "bg-primary/10 font-bold text-accent-foreground",
        className
      )}
      type="button"
      title={title}
      style={style}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export { FloatingToolbar };
