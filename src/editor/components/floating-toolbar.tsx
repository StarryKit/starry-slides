import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CaseSensitive,
  ChevronDown,
  Circle,
  CircleDashed,
  Ellipsis,
  Group,
  Italic,
  Layers,
  Link2,
  Lock,
  LockOpen,
  Minus,
  Palette,
  Plus,
  Rows3,
  Square,
  Strikethrough,
  Type,
  Underline,
  Ungroup,
} from "lucide-react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { EditableType } from "../../core";
import type { CssPropertyRow } from "../lib/collect-css-properties";
import { commitElementToolFeature } from "../lib/element-tool-commit";
import {
  ALIGN_TO_SLIDE_OPTIONS,
  BORDER_RADIUS_OPTIONS,
  BORDER_STYLE_OPTIONS,
  DISTRIBUTE_OPTIONS,
  ELEMENT_TOOL_GROUPS,
  type ElementToolFeature,
  type ElementToolOption,
  LAYER_ORDER_OPTIONS,
  LINE_HEIGHT_OPTIONS,
  SHADOW_OPTIONS,
  TEXT_ALIGN_OPTIONS,
} from "../lib/element-tool-model";
import { getElementToolValue, isFeatureActive } from "../lib/element-tool-values";
import {
  EDITOR_MOTION_MS,
  editorMotionClassName,
  editorPanelEnterClassName,
  editorPanelExitClassName,
} from "../lib/motion";
import { FONT_FAMILY_OPTIONS, getFontFamilyLabel } from "../lib/style-controls";
import { cn } from "../lib/utils";
import { ColorPicker } from "./color-picker";
import { Divider, IconButton, ToolbarIcon, shouldUpdateOffset } from "./floating-toolbar-parts";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Textarea } from "./ui/textarea";

interface FloatingToolbarProps {
  inspectedStyles: CssPropertyRow[];
  selectedElementType: EditableType | "multi";
  selectionCommandAvailability: SelectionCommandAvailability;
  isSelectedElementLocked: boolean;
  attributeValues: AttributeValues;
  onStyleChange: (propertyName: string, nextValue: string) => void;
  onStylePreview: (propertyName: string, nextValue: string | null) => void;
  onAttributeChange: (attributeName: string, nextValue: string) => void;
  onAlignToSlide: (action: string) => void;
  onDistribute: (action: string) => void;
  onGroup: () => void;
  onLayerOrder: (action: string) => void;
  onUngroup: () => void;
}

interface AttributeValues {
  locked: string;
  altText: string;
  ariaLabel: string;
  linkUrl: string;
}

export interface SelectionCommandAvailability {
  group: boolean;
  ungroup: boolean;
}

type EditableAttributeId = "other-link" | "other-alt-text" | "other-aria-label";

const FEATURE_BY_ID = new Map(
  ELEMENT_TOOL_GROUPS.flatMap((group) =>
    group.subgroups.flatMap((subgroup) => subgroup.features.map((feature) => [feature.id, feature]))
  )
);

const OTHER_FEATURES: Record<EditableAttributeId, ElementToolFeature> = {
  "other-aria-label": {
    id: "other-aria-label",
    label: "ARIA label",
    controlType: "text",
    target: "operation",
  },
  "other-alt-text": {
    id: "other-alt-text",
    label: "Alt text",
    controlType: "text",
    target: "operation",
  },
  "other-link": {
    id: "other-link",
    label: "Link",
    controlType: "text",
    target: "operation",
  },
};

const toolbarIconClassName = "size-3.5";
const toolbarIconMutedClassName = "size-3.5 text-foreground/55";
const toolbarIconDropShadowClassName = "size-3.5 drop-shadow";
const ICON_STROKE_WIDTH = 2.5;

function FloatingToolbar({
  inspectedStyles,
  selectedElementType,
  selectionCommandAvailability,
  isSelectedElementLocked,
  attributeValues,
  onStyleChange,
  onStylePreview,
  onAttributeChange,
  onAlignToSlide,
  onDistribute,
  onGroup,
  onLayerOrder,
  onUngroup,
}: FloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarOffsetX, setToolbarOffsetX] = useState(0);
  const toolbarOffsetXRef = useRef(0);
  const [activeAttributeDialog, setActiveAttributeDialog] = useState<EditableAttributeId | null>(
    null
  );
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);
  const showMultiTools = selectedElementType === "multi";
  const showGroupTool = showMultiTools || selectionCommandAvailability.ungroup;

  useEffect(() => {
    const node = toolbarRef.current;
    if (!node) {
      return;
    }

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
      ghost.classList.remove("motion-safe:animate-in", "motion-safe:fade-in-0");
      ghost.className = cn(ghost.className, editorPanelExitClassName);
      ghost.setAttribute("aria-hidden", "true");
      ghost.style.left = `${toolbarRect.left - stageRect.left}px`;
      ghost.style.top = `${toolbarRect.top - stageRect.top}px`;
      ghost.style.width = `${toolbarRect.width}px`;
      ghost.style.height = `${toolbarRect.height}px`;
      stagePanel.appendChild(ghost);
      ghost.addEventListener("animationend", () => ghost.remove());
      window.setTimeout(() => ghost.remove(), EDITOR_MOTION_MS + 50);
    };
  }, []);

  useLayoutEffect(() => {
    const node = toolbarRef.current;
    if (!node) {
      return;
    }

    const rect = node.getBoundingClientRect();
    const baseLeft = rect.left - toolbarOffsetXRef.current;
    const baseRight = rect.right - toolbarOffsetXRef.current;
    const viewportPadding = 16;
    let nextOffsetX = 0;

    if (baseLeft < viewportPadding) {
      nextOffsetX = viewportPadding - baseLeft;
    }
    if (baseRight + nextOffsetX > window.innerWidth - viewportPadding) {
      nextOffsetX += window.innerWidth - viewportPadding - (baseRight + nextOffsetX);
    }

    if (shouldUpdateOffset(toolbarOffsetXRef.current, nextOffsetX)) {
      toolbarOffsetXRef.current = nextOffsetX;
      setToolbarOffsetX(nextOffsetX);
    }
  }, []);

  useEffect(() => {
    function closeOnOutsidePointer(event: MouseEvent) {
      const target = event.target;
      if (toolbarRef.current?.contains(event.target as Node)) {
        return;
      }

      if (target instanceof Element && target.closest('[data-slot="select-content"]')) {
        return;
      }

      setActivePopoverId(null);
    }

    document.addEventListener("mousedown", closeOnOutsidePointer);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsidePointer);
    };
  }, []);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setActivePopoverId(null);
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function commitFeature(feature: ElementToolFeature, nextValue: string) {
    if (feature.id === "distribute") {
      onDistribute(nextValue);
      return;
    }
    if (feature.id === "group") {
      onGroup();
      return;
    }
    if (feature.id === "ungroup") {
      onUngroup();
      return;
    }
    if (feature.id === "other-link") {
      onAttributeChange("data-link-url", nextValue.trim());
      return;
    }
    if (feature.id === "other-alt-text") {
      onAttributeChange("alt", nextValue.trim());
      return;
    }
    if (feature.id === "other-aria-label") {
      onAttributeChange("aria-label", nextValue.trim());
      return;
    }
    if (feature.id === "background-color" && nextValue.startsWith("linear-gradient")) {
      onStyleChange("background-image", nextValue);
      return;
    }

    commitElementToolFeature({
      attributeValues,
      feature,
      inspectedStyles,
      nextValue,
      onAlignToSlide,
      onAttributeChange,
      onLayerOrder,
      onStyleChange,
    });
  }

  return (
    <div
      className={cn(
        "relative grid w-max min-w-max max-w-[min(1120px,calc(100vw-280px))] gap-2 text-foreground pointer-events-auto max-[1200px]:w-full max-[1200px]:min-w-0",
        editorMotionClassName,
        editorPanelEnterClassName
      )}
      ref={toolbarRef}
      style={{ marginLeft: toolbarOffsetX }}
    >
      <div
        className="flex w-max items-center gap-0.5 overflow-x-auto overflow-y-hidden rounded-2xl border border-foreground/[0.08] bg-white/92 px-1.5 py-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl max-[1200px]:min-w-[940px]"
        aria-label="Full editing toolbar"
      >
        {renderLockSection()}
        {isSelectedElementLocked ? null : (
          <>
            <Divider />
            {renderFontSection()}
            <Divider />
            {renderTextStyleSection()}
            <Divider />
            {renderColorSection()}
            <Divider />
            {renderParagraphSection()}
            <Divider />
            {renderBorderSection()}
            {showMultiTools ? (
              <>
                <Divider />
                {renderMultiArrangeSection()}
              </>
            ) : null}
            {showGroupTool ? (
              <>
                <Divider />
                {renderGroupSection()}
              </>
            ) : null}
            <Divider />
            {renderOtherSection()}
          </>
        )}
      </div>

      <AttributeDialog
        attributeValues={attributeValues}
        dialogId={activeAttributeDialog}
        onCommitFeature={commitFeature}
        onOpenChange={(open) => {
          if (!open) {
            setActiveAttributeDialog(null);
          }
        }}
      />
    </div>
  );

  function renderLockSection() {
    return (
      <ToolbarSection>
        <IconButton
          label={isSelectedElementLocked ? "Unlock" : "Lock"}
          active={isSelectedElementLocked}
          onClick={() => commitFeature(getFeature("locked"), isSelectedElementLocked ? "" : "true")}
        >
          {isSelectedElementLocked ? (
            <LockOpen className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />
          ) : (
            <Lock className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />
          )}
        </IconButton>
      </ToolbarSection>
    );
  }

  function renderFontSection() {
    const fontFamilyFeature = getFeature("font-family");
    const fontSizeFeature = getFeature("font-size");
    const fontFamilyValue = getCurrentValue(fontFamilyFeature);
    const fontSizeValue = getCurrentValue(fontSizeFeature);

    return (
      <ToolbarSection>
        <FontFamilyCombobox
          currentValue={fontFamilyValue}
          onCommit={(nextValue) => commitFeature(fontFamilyFeature, nextValue)}
          onOpen={() => setActivePopoverId(null)}
          onPreview={(nextValue) => onStylePreview("font-family", nextValue)}
        />

        <FontSizeControl
          currentValue={fontSizeValue}
          feature={fontSizeFeature}
          onCommitFeature={commitFeature}
        />
      </ToolbarSection>
    );
  }

  function renderTextStyleSection() {
    return (
      <ToolbarSection>
        {[
          { feature: getFeature("font-bold"), icon: Bold },
          { feature: getFeature("font-italic"), icon: Italic },
          { feature: getFeature("font-underline"), icon: Underline },
          { feature: getFeature("font-strikethrough"), icon: Strikethrough },
        ].map(({ feature, icon: Icon }) => {
          const active = isFeatureActive(feature, getCurrentValue(feature));
          return (
            <IconButton
              key={feature.id}
              label={feature.label}
              active={active}
              onClick={() => commitFeature(feature, active ? "" : "true")}
            >
              <Icon className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />
            </IconButton>
          );
        })}
      </ToolbarSection>
    );
  }

  function renderColorSection() {
    return (
      <ToolbarSection>
        {renderColorPopover({
          feature: getFeature("text-color"),
          icon: <Palette className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />,
          includeGradients: true,
          label: "Text color",
          popoverId: "text-color",
        })}
        {renderColorPopover({
          feature: getFeature("background-color"),
          icon: <Square className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />,
          includeGradients: true,
          label: "Background color",
          popoverId: "background-color",
        })}
      </ToolbarSection>
    );
  }

  function renderParagraphSection() {
    return (
      <ToolbarSection>
        {renderOptionsPopover({
          custom: (
            <NumericCommitControl
              feature={getFeature("line-height")}
              label="Custom line height"
              onCommitFeature={commitFeature}
            />
          ),
          feature: getFeature("line-height"),
          icon: <Rows3 className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />,
          label: "Line height",
          options: LINE_HEIGHT_OPTIONS,
          popoverId: "line-height",
        })}
        {renderOptionsPopover({
          feature: getFeature("text-align"),
          icon: <AlignCenter className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />,
          label: "Text align",
          options: TEXT_ALIGN_OPTIONS,
          popoverId: "text-align",
        })}
      </ToolbarSection>
    );
  }

  function renderBorderSection() {
    return (
      <ToolbarSection>
        {renderOptionsPopover({
          feature: getFeature("border"),
          icon: <CircleDashed className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />,
          label: "Border style",
          options: BORDER_STYLE_OPTIONS,
          popoverId: "border",
        })}
        {renderOptionsPopover({
          custom: (
            <NumericCommitControl
              feature={getFeature("border-radius")}
              label="Custom radius"
              onCommitFeature={commitFeature}
              unit="px"
            />
          ),
          feature: getFeature("border-radius"),
          icon: <Circle className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />,
          label: "Border radius",
          options: BORDER_RADIUS_OPTIONS,
          popoverId: "border-radius",
        })}
        {renderOptionsPopover({
          custom: (
            <TextCommitControl
              feature={getFeature("box-shadow")}
              label="Custom shadow"
              onCommitFeature={commitFeature}
            />
          ),
          feature: getFeature("box-shadow"),
          icon: (
            <Square className={toolbarIconDropShadowClassName} strokeWidth={ICON_STROKE_WIDTH} />
          ),
          label: "Shadow",
          options: SHADOW_OPTIONS,
          popoverId: "box-shadow",
        })}
      </ToolbarSection>
    );
  }

  function renderMultiArrangeSection() {
    return (
      <ToolbarSection>
        {renderOptionsPopover({
          feature: getFeature("align-to-slide"),
          icon: <AlignCenter className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />,
          label: "Align",
          options: ALIGN_TO_SLIDE_OPTIONS,
          popoverId: "align",
        })}
        {renderOptionsPopover({
          feature: getFeature("layer-order"),
          icon: <Layers className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />,
          label: "Layer",
          options: LAYER_ORDER_OPTIONS,
          popoverId: "layer",
        })}
        {renderOptionsPopover({
          feature: getFeature("distribute"),
          icon: <Rows3 className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />,
          label: "Distribute",
          options: DISTRIBUTE_OPTIONS,
          popoverId: "distribute",
        })}
      </ToolbarSection>
    );
  }

  function renderGroupSection() {
    const canUngroup = selectionCommandAvailability.ungroup;
    const feature = getFeature(canUngroup ? "ungroup" : "group");
    return (
      <ToolbarSection>
        <IconButton
          label={canUngroup ? "Ungroup" : "Group"}
          onClick={() => commitFeature(feature, canUngroup ? "ungroup" : "group")}
        >
          {canUngroup ? (
            <Ungroup className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />
          ) : (
            <Group className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />
          )}
        </IconButton>
      </ToolbarSection>
    );
  }

  function renderOtherSection() {
    return (
      <ToolbarSection>
        <Popover
          open={activePopoverId === "other"}
          onOpenChange={(open) => setActivePopoverId(open ? "other" : null)}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Other"
              title="Other"
              className={cn(
                toolbarIconButtonClassName,
                activePopoverId === "other" && toolbarIconButtonActiveClassName
              )}
            >
              <Ellipsis className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-1.5">
            <button
              type="button"
              className={menuItemClassName}
              onClick={() => {
                setActivePopoverId(null);
                setActiveAttributeDialog("other-link");
              }}
            >
              <Link2 className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />
              Link
            </button>
            <button
              type="button"
              className={menuItemClassName}
              onClick={() => {
                setActivePopoverId(null);
                setActiveAttributeDialog("other-alt-text");
              }}
            >
              <CaseSensitive className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />
              Alt text
            </button>
            <button
              type="button"
              className={menuItemClassName}
              onClick={() => {
                setActivePopoverId(null);
                setActiveAttributeDialog("other-aria-label");
              }}
            >
              <CaseSensitive className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />
              ARIA label
            </button>
          </PopoverContent>
        </Popover>
      </ToolbarSection>
    );
  }

  function renderColorPopover({
    feature,
    icon,
    includeGradients,
    label,
    popoverId,
  }: {
    feature: ElementToolFeature;
    icon: ReactNode;
    includeGradients: boolean;
    label: string;
    popoverId: string;
  }) {
    return (
      <Popover
        open={activePopoverId === popoverId}
        onOpenChange={(open) => setActivePopoverId(open ? popoverId : null)}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            title={label}
            className={cn(
              toolbarIconButtonClassName,
              activePopoverId === popoverId && toolbarIconButtonActiveClassName
            )}
          >
            {icon}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 max-h-[calc(100vh-40px)] overflow-y-auto p-2">
          <ColorPicker
            value={getCurrentValue(feature)}
            ariaLabelPrefix={label}
            includeGradients={includeGradients}
            onChange={(nextValue) => commitFeature(feature, nextValue)}
            onCommit={() => setActivePopoverId(null)}
          />
        </PopoverContent>
      </Popover>
    );
  }

  function renderOptionsPopover({
    custom,
    feature,
    icon,
    label,
    options,
    popoverId,
  }: {
    custom?: ReactNode;
    feature: ElementToolFeature;
    icon: ReactNode;
    label: string;
    options: ElementToolOption[];
    popoverId: string;
  }) {
    const currentValue = getCurrentValue(feature);
    const triggerIcon = feature.id === "text-align" ? getTextAlignIcon(currentValue) : icon;
    return (
      <Popover
        open={activePopoverId === popoverId}
        onOpenChange={(open) => setActivePopoverId(open ? popoverId : null)}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            title={label}
            className={cn(
              toolbarIconButtonClassName,
              activePopoverId === popoverId && toolbarIconButtonActiveClassName
            )}
          >
            {triggerIcon}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-1.5">
          <div className="grid gap-1">
            {options.map((option) => {
              const Icon = option.icon;
              const disabled =
                feature.target === "operation" &&
                feature.id === "distribute" &&
                !selectionCommandAvailability.group;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    menuItemClassName,
                    currentValue === option.value && "bg-foreground/[0.06]"
                  )}
                  disabled={disabled}
                  onClick={() => {
                    commitFeature(feature, option.value);
                    setActivePopoverId(null);
                  }}
                >
                  {Icon ? (
                    <ToolbarIcon icon={Icon} />
                  ) : (
                    <OptionSwatch feature={feature} option={option} />
                  )}
                  <span className="truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
          {custom ? (
            <div className="mt-2 border-t border-foreground/[0.08] pt-2">{custom}</div>
          ) : null}
        </PopoverContent>
      </Popover>
    );
  }

  function getCurrentValue(feature: ElementToolFeature) {
    return getElementToolValue({ attributeValues, feature, inspectedStyles });
  }
}

function AttributeDialog({
  attributeValues,
  dialogId,
  onCommitFeature,
  onOpenChange,
}: {
  attributeValues: AttributeValues;
  dialogId: EditableAttributeId | null;
  onCommitFeature: (feature: ElementToolFeature, nextValue: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const config = dialogId ? attributeDialogConfig[dialogId] : null;
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!dialogId) {
      return;
    }
    setDraft(getAttributeDialogValue(dialogId, attributeValues));
  }, [attributeValues, dialogId]);

  return (
    <Dialog open={Boolean(dialogId)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config?.title}</DialogTitle>
          <DialogDescription>{config?.description}</DialogDescription>
        </DialogHeader>
        {config?.multiline ? (
          <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} />
        ) : (
          <Input value={draft} onChange={(event) => setDraft(event.target.value)} />
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (!dialogId) {
                return;
              }
              onCommitFeature(OTHER_FEATURES[dialogId], draft);
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FontFamilyCombobox({
  currentValue,
  onCommit,
  onOpen,
  onPreview,
}: {
  currentValue: string;
  onCommit: (nextValue: string) => void;
  onOpen: () => void;
  onPreview: (nextValue: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [previewLabel, setPreviewLabel] = useState("");
  const selectedLabel = getFontFamilyLabel(currentValue);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredFonts = normalizedQuery
    ? FONT_FAMILY_OPTIONS.filter((font) =>
        `${font.label} ${font.value}`.toLowerCase().includes(normalizedQuery)
      )
    : FONT_FAMILY_OPTIONS;
  const visibleValue = previewLabel || (open ? query : selectedLabel);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setPreviewLabel("");
      onPreview(null);
    }
  }, [onPreview, open]);

  function commitFont(nextValue: string) {
    setPreviewLabel("");
    onPreview(null);
    onCommit(nextValue);
    setOpen(false);
  }

  function previewFont(label: string, nextValue: string) {
    setPreviewLabel(label);
    onPreview(nextValue);
  }

  function clearPreview() {
    setPreviewLabel("");
    onPreview(null);
  }

  function openMenu() {
    onOpen();
    setOpen(true);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMenu();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const exactMatch = filteredFonts.find((font) => font.label.toLowerCase() === normalizedQuery);
      const nextFont = exactMatch ?? filteredFonts[0];
      if (nextFont) {
        commitFont(nextFont.value);
      }
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative flex h-7.5 w-[126px] items-center rounded-xl border border-transparent bg-transparent text-foreground/75 transition-colors hover:bg-foreground/[0.05] focus-within:border-foreground/20 focus-within:bg-white focus-within:ring-[2px] focus-within:ring-ring/35">
          <Type
            className={cn(toolbarIconMutedClassName, "pointer-events-none absolute left-2")}
            strokeWidth={ICON_STROKE_WIDTH}
          />
          <Input
            aria-controls="floating-font-menu"
            aria-expanded={open}
            aria-label="Font"
            autoComplete="off"
            className="h-full min-w-0 border-0 bg-transparent px-7 text-[12px] shadow-none outline-none ring-0 placeholder:text-foreground/45 focus-visible:ring-0"
            data-value={currentValue}
            onChange={(event) => {
              setPreviewLabel("");
              setQuery(event.target.value);
              openMenu();
            }}
            onClick={openMenu}
            onFocus={openMenu}
            onKeyDown={handleKeyDown}
            placeholder="Font"
            role="combobox"
            value={visibleValue}
          />
          <button
            type="button"
            className="absolute right-0.5 grid size-6.5 place-items-center rounded-lg text-foreground/45 transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            aria-label="Show fonts"
            onClick={() => {
              if (open) {
                setOpen(false);
                return;
              }
              openMenu();
            }}
          >
            <ChevronDown
              className={toolbarIconClassName}
              strokeWidth={ICON_STROKE_WIDTH}
              aria-hidden="true"
            />
          </button>
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        avoidCollisions
        className="w-[240px] p-1.5"
        data-testid="floating-font-menu"
        id="floating-font-menu"
        onOpenAutoFocus={(event) => event.preventDefault()}
        side="bottom"
        sideOffset={18}
      >
        <div className="h-56 overflow-y-auto pr-1" data-testid="floating-font-menu-scroll">
          {filteredFonts.length ? (
            filteredFonts.map((font) => (
              <button
                type="button"
                key={font.value}
                className={cn(
                  menuItemClassName,
                  currentValue === font.value && "bg-foreground/[0.06]"
                )}
                data-value={font.value}
                onBlur={clearPreview}
                onClick={() => commitFont(font.value)}
                onFocus={() => previewFont(font.label, font.value)}
                onMouseEnter={() => previewFont(font.label, font.value)}
                onMouseLeave={clearPreview}
                style={{ fontFamily: font.value }}
              >
                <span className="truncate">{font.label}</span>
              </button>
            ))
          ) : (
            <div className="px-2.5 py-2 text-[13px] text-foreground/45">No fonts found</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NumericCommitControl({
  feature,
  label,
  onCommitFeature,
  unit = "",
}: {
  feature: ElementToolFeature;
  label: string;
  onCommitFeature: (feature: ElementToolFeature, nextValue: string) => void;
  unit?: string;
}) {
  const [draft, setDraft] = useState("");
  const inputId = `floating-${feature.id}-custom`;
  return (
    <div className="grid gap-1.5">
      <label
        className="text-[10px] font-medium uppercase tracking-wider text-foreground/45"
        htmlFor={inputId}
      >
        {label}
      </label>
      <div className="flex gap-1">
        <Input
          className="h-8 min-w-0"
          id={inputId}
          inputMode="decimal"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!draft.trim()}
          onClick={() => {
            onCommitFeature(feature, `${draft.trim()}${unit}`);
            setDraft("");
          }}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}

function TextCommitControl({
  feature,
  label,
  onCommitFeature,
}: {
  feature: ElementToolFeature;
  label: string;
  onCommitFeature: (feature: ElementToolFeature, nextValue: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const inputId = `floating-${feature.id}-custom`;
  return (
    <div className="grid gap-1.5">
      <label
        className="text-[10px] font-medium uppercase tracking-wider text-foreground/45"
        htmlFor={inputId}
      >
        {label}
      </label>
      <Textarea id={inputId} value={draft} onChange={(event) => setDraft(event.target.value)} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!draft.trim()}
        onClick={() => {
          onCommitFeature(feature, draft.trim());
          setDraft("");
        }}
      >
        Apply
      </Button>
    </div>
  );
}

function FontSizeControl({
  currentValue,
  feature,
  onCommitFeature,
}: {
  currentValue: string;
  feature: ElementToolFeature;
  onCommitFeature: (feature: ElementToolFeature, nextValue: string) => void;
}) {
  const [draft, setDraft] = useState(() => getFontSizeDraftValue(currentValue));
  const [isFocused, setIsFocused] = useState(false);
  const committedDraftRef = useRef(getFontSizeDraftValue(currentValue));

  useEffect(() => {
    const nextDraft = getFontSizeDraftValue(currentValue);
    committedDraftRef.current = nextDraft;
    if (!isFocused) {
      setDraft(nextDraft);
    }
  }, [currentValue, isFocused]);

  useEffect(() => {
    if (!isFocused || !draft.trim() || draft.trim() === committedDraftRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      commitDraftValue(draft, false);
    }, FONT_SIZE_INPUT_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [draft, isFocused]);

  const currentFontSize = parseFontSizeValue(currentValue);

  function commitDraft() {
    commitDraftValue(draft, true);
  }

  function commitDraftValue(nextDraft: string, syncDraft: boolean) {
    const trimmedDraft = nextDraft.trim();
    if (!trimmedDraft) {
      setDraft(getFontSizeDraftValue(currentValue));
      return;
    }

    const nextValue = normalizeFontSizeInput(nextDraft);
    if (nextValue === committedDraftRef.current) {
      if (syncDraft) {
        setDraft(nextValue);
      }
      return;
    }

    committedDraftRef.current = nextValue;
    onCommitFeature(feature, nextValue);
    if (syncDraft) {
      setDraft(nextValue);
    }
  }

  function commitStep(direction: "decrease" | "increase") {
    const draftValue = Number.parseFloat(draft);
    const baseValue = Number.isFinite(draftValue) ? draftValue : currentFontSize;
    const sign = direction === "increase" ? 1 : -1;
    const nextValue = String(clamp(baseValue + sign * (feature.step ?? 2), 8, 200));
    onCommitFeature(feature, nextValue);
    setDraft(nextValue);
  }

  return (
    <div className="flex items-center rounded-xl">
      <IconButton
        className="size-6.5 rounded-lg border-0 shadow-none hover:shadow-none"
        label="Decrease font size"
        onClick={() => commitStep("decrease")}
      >
        <Minus className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />
      </IconButton>
      <Input
        aria-label="Font size"
        className="h-6.5 w-10 rounded-lg border-0 bg-transparent px-1 text-center text-[11px] font-semibold leading-none tabular-nums text-foreground/75 shadow-none [appearance:textfield] hover:bg-foreground/[0.04] focus-visible:bg-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        inputMode="decimal"
        min={feature.min ?? 8}
        max={feature.max ?? 200}
        step={feature.step ?? 2}
        type="number"
        value={draft}
        onBlur={() => {
          commitDraft();
          setIsFocused(false);
        }}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={() => setIsFocused(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            setDraft(getFontSizeDraftValue(currentValue));
            event.currentTarget.blur();
          }
        }}
      />
      <IconButton
        className="size-6.5 rounded-lg border-0 shadow-none hover:shadow-none"
        label="Increase font size"
        onClick={() => commitStep("increase")}
      >
        <Plus className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />
      </IconButton>
    </div>
  );
}

function ToolbarSection({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-px rounded-xl">{children}</div>;
}

function OptionSwatch({
  feature,
  option,
}: {
  feature: ElementToolFeature;
  option: ElementToolOption;
}) {
  if (feature.id === "border") {
    return (
      <span
        className="size-4 rounded bg-white"
        style={{
          border: option.value === "none" ? "1px solid rgba(15,23,42,.12)" : option.value,
        }}
      />
    );
  }
  if (feature.id === "border-radius") {
    return (
      <span
        className="size-4 border border-foreground/15 bg-foreground/[0.04]"
        style={{ borderRadius: option.value }}
      />
    );
  }
  if (feature.id === "box-shadow") {
    return (
      <span
        className="size-4 rounded border border-foreground/10 bg-white"
        style={{ boxShadow: option.value === "none" ? undefined : option.value }}
      />
    );
  }
  return <span className="size-1.5 rounded-full bg-foreground/35" />;
}

function getFeature(featureId: ElementToolFeature["id"]) {
  const feature = FEATURE_BY_ID.get(featureId);
  if (!feature) {
    throw new Error(`Missing floating toolbar feature: ${featureId}`);
  }
  return feature;
}

function getTextAlignIcon(currentValue: string) {
  if (currentValue === "left") {
    return <AlignLeft className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />;
  }
  if (currentValue === "right") {
    return <AlignRight className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />;
  }
  return <AlignCenter className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getFontSizeDraftValue(currentValue: string) {
  return String(parseFontSizeValue(currentValue));
}

function normalizeFontSizeInput(value: string) {
  const numericValue = Number.parseFloat(value);
  return String(clamp(Number.isFinite(numericValue) ? numericValue : 8, 8, 200));
}

function parseFontSizeValue(value: string) {
  const numericValue = Number.parseFloat(value);
  return Number.isFinite(numericValue) ? numericValue : 32;
}

function getAttributeDialogValue(dialogId: EditableAttributeId, attributeValues: AttributeValues) {
  if (dialogId === "other-link") {
    return attributeValues.linkUrl;
  }
  if (dialogId === "other-alt-text") {
    return attributeValues.altText;
  }
  return attributeValues.ariaLabel;
}

const attributeDialogConfig: Record<
  EditableAttributeId,
  { description: string; multiline?: boolean; title: string }
> = {
  "other-aria-label": {
    description: "Set the ARIA label used by assistive technologies.",
    title: "ARIA label",
  },
  "other-alt-text": {
    description: "Describe the selected visual element.",
    multiline: true,
    title: "Alt text",
  },
  "other-link": {
    description: "Attach a URL to the selected element.",
    title: "Link",
  },
};

const menuItemClassName =
  "flex min-h-7 w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[12px] text-foreground/70 outline-none transition-colors hover:bg-foreground/[0.05] hover:text-foreground focus-visible:bg-foreground/[0.06] focus-visible:text-foreground focus-visible:ring-[2px] focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-40";

const toolbarIconButtonClassName =
  "size-7.5 rounded-xl text-foreground/60 transition-colors hover:bg-foreground/[0.05] hover:text-foreground active:scale-[0.98]";

const toolbarIconButtonActiveClassName =
  "bg-foreground/[0.07] text-foreground shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] hover:bg-foreground/[0.08]";

const FONT_SIZE_INPUT_DEBOUNCE_MS = 500;

export { FloatingToolbar };
