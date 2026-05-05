import { PanelRightOpen } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useId } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CssPropertyRow } from "../lib/collect-css-properties";
import {
  ELEMENT_TOOL_GROUPS,
  type ElementToolFeature,
  type ElementToolSubgroup,
} from "../lib/element-tool-model";
import {
  getElementToolValue,
  getFeatureOptions,
  getTextDecorationCommitValue,
  isFeatureActive,
  normalizeFeatureCommitValue,
} from "../lib/element-tool-values";
import {
  EDITOR_MOTION_MS,
  editorMotionClassName,
  editorPanelEnterClassName,
  editorPanelExitClassName,
} from "../lib/motion";
import { cn } from "../lib/utils";
import { ColorPicker } from "./color-picker";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Separator } from "./ui/separator";

interface FloatingToolbarProps {
  inspectedStyles: CssPropertyRow[];
  attributeValues: AttributeValues;
  onStyleChange: (propertyName: string, nextValue: string) => void;
  onAttributeChange: (attributeName: string, nextValue: string) => void;
  onAlignToSlide: (action: string) => void;
  onLayerOrder: (action: string) => void;
  onModeChange: () => void;
}

interface AttributeValues {
  locked: string;
  altText: string;
  ariaLabel: string;
  linkUrl: string;
}

const EMPTY_SELECT_VALUE = "__empty__";

function FloatingToolbar({
  inspectedStyles,
  attributeValues,
  onStyleChange,
  onAttributeChange,
  onAlignToSlide,
  onLayerOrder,
  onModeChange,
}: FloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [activeSubgroupId, setActiveSubgroupId] = useState<string | null>(null);
  const [panelLeft, setPanelLeft] = useState(0);
  const [toolbarOffsetX, setToolbarOffsetX] = useState(0);
  const toolbarOffsetXRef = useRef(0);

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
      ghost.addEventListener("animationend", () => {
        ghost.remove();
      });
      window.setTimeout(() => {
        ghost.remove();
      }, EDITOR_MOTION_MS + 50);
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
      if (toolbarRef.current?.contains(event.target as Node)) {
        return;
      }

      setActiveSubgroupId(null);
    }

    document.addEventListener("mousedown", closeOnOutsidePointer);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsidePointer);
    };
  }, []);

  function toggleSubgroup(subgroupId: string, event: ReactMouseEvent<HTMLButtonElement>) {
    setPanelLeft(event.currentTarget.offsetLeft);
    setActiveSubgroupId((current) => (current === subgroupId ? null : subgroupId));
  }

  function commitFeature(feature: ElementToolFeature, nextValue: string) {
    if (feature.target === "style" && feature.propertyName) {
      const currentValue = getElementToolValue({ feature, inspectedStyles, attributeValues });

      if (feature.id === "font-underline") {
        onStyleChange(
          feature.propertyName,
          getTextDecorationCommitValue(currentValue, "underline", nextValue === "")
        );
        return;
      }

      if (feature.id === "font-strikethrough") {
        onStyleChange(
          feature.propertyName,
          getTextDecorationCommitValue(currentValue, "line-through", nextValue === "")
        );
        return;
      }

      onStyleChange(feature.propertyName, normalizeFeatureCommitValue(feature, nextValue));
      return;
    }

    if (feature.target === "attribute" && feature.attributeName) {
      onAttributeChange(feature.attributeName, normalizeFeatureCommitValue(feature, nextValue));
      return;
    }

    if (feature.id === "align-to-slide") {
      onAlignToSlide(nextValue);
    }

    if (feature.id === "layer-order") {
      onLayerOrder(nextValue);
    }
  }

  return (
    <div
      className={cn(
        "relative grid w-max min-w-max max-w-[min(980px,calc(100vw-280px))] gap-2 text-foreground pointer-events-auto max-[1200px]:w-full max-[1200px]:min-w-0",
        editorMotionClassName,
        editorPanelEnterClassName
      )}
      ref={toolbarRef}
      style={{ marginLeft: toolbarOffsetX }}
    >
      <div
        className="flex w-max items-center gap-0.5 overflow-x-auto overflow-y-hidden rounded-md border border-foreground/[0.08] bg-white px-1.5 py-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.06)] max-[1200px]:min-w-[760px]"
        aria-label="Formatting toolbar"
      >
        {ELEMENT_TOOL_GROUPS.map((group, groupIndex) => (
          <div key={group.id} className="contents">
            {groupIndex > 0 ? <Divider /> : null}
            <div className="flex items-center gap-0.5 rounded-md bg-foreground/[0.02] px-0.5">
              {group.subgroups.map((subgroup) => {
                const singleFeature = subgroup.features.length === 1 ? subgroup.features[0] : null;
                if (singleFeature?.controlType === "toggle") {
                  return renderDirectToggle(subgroup, singleFeature);
                }

                return (
                  <ToolbarTrigger
                    key={subgroup.id}
                    active={activeSubgroupId === subgroup.id}
                    label={subgroup.label}
                    onClick={(event) => toggleSubgroup(subgroup.id, event)}
                  >
                    <ToolbarIcon icon={subgroup.icon} />
                  </ToolbarTrigger>
                );
              })}
            </div>
          </div>
        ))}
        <Divider />
        <IconButton label="Use tool panel mode" onClick={onModeChange}>
          <ToolbarIcon icon={PanelRightOpen} />
        </IconButton>
      </div>

      {ELEMENT_TOOL_GROUPS.flatMap((group) => group.subgroups).map((subgroup) =>
        activeSubgroupId === subgroup.id ? (
          <ToolbarPanel key={subgroup.id} left={panelLeft} width={getPanelWidth(subgroup)}>
            <PanelTitle>{subgroup.label}</PanelTitle>
            <div className="grid gap-2">{subgroup.features.map(renderFeature)}</div>
          </ToolbarPanel>
        ) : null
      )}
    </div>
  );

  function renderDirectToggle(subgroup: ElementToolSubgroup, feature: ElementToolFeature) {
    const currentValue = getElementToolValue({ feature, inspectedStyles, attributeValues });
    const active = isFeatureActive(feature, currentValue);
    return (
      <IconButton
        key={subgroup.id}
        label={feature.label}
        active={active}
        onClick={() => commitFeature(feature, active ? "" : "true")}
      >
        <ToolbarIcon icon={subgroup.icon} />
      </IconButton>
    );
  }

  function renderFeature(feature: ElementToolFeature) {
    const currentValue = getElementToolValue({ feature, inspectedStyles, attributeValues });
    const fieldId = `floating-${feature.id}`;

    if (feature.controlType === "select") {
      return (
        <div key={feature.id} className="grid gap-1">
          <FieldLabel htmlFor={fieldId}>{feature.label}</FieldLabel>
          <Select
            value={currentValue || EMPTY_SELECT_VALUE}
            onValueChange={(nextValue) =>
              commitFeature(feature, nextValue === EMPTY_SELECT_VALUE ? "" : nextValue)
            }
          >
            <SelectTrigger
              id={fieldId}
              aria-label={feature.label}
              size="sm"
              className="h-8 rounded-md border-transparent bg-foreground/[0.03] px-2 text-xs shadow-none hover:bg-foreground/[0.06]"
              data-value={currentValue}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {getFeatureOptions(feature, currentValue).map((option) => (
                  <SelectItem
                    key={option.value || EMPTY_SELECT_VALUE}
                    value={option.value || EMPTY_SELECT_VALUE}
                    data-value={option.value}
                    style={
                      feature.id === "font-family" && option.value
                        ? { fontFamily: option.value }
                        : undefined
                    }
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (feature.controlType === "color") {
      return (
        <div key={feature.id} className="grid gap-1">
          <FieldLabel>{feature.label}</FieldLabel>
          <ColorPicker
            value={currentValue}
            includeGradients={feature.id === "background-color"}
            onChange={(nextValue) => commitFeature(feature, nextValue)}
          />
        </div>
      );
    }

    if (feature.controlType === "toggle") {
      const active = isFeatureActive(feature, currentValue);
      return (
        <Button
          key={feature.id}
          type="button"
          variant={active ? "secondary" : "outline"}
          aria-pressed={active}
          onClick={() => commitFeature(feature, active ? "" : "true")}
        >
          {feature.label}
        </Button>
      );
    }

    if (feature.controlType === "slider" || feature.controlType === "number") {
      return (
        <div key={feature.id} className="grid gap-1">
          <FieldLabel htmlFor={fieldId}>{feature.label}</FieldLabel>
          <Input
            id={fieldId}
            type="number"
            min={feature.min}
            max={feature.max}
            step={feature.step}
            value={currentValue}
            onChange={(event) => commitFeature(feature, event.target.value)}
            className="h-8 rounded-md bg-foreground/[0.03] px-2 text-[13px] tabular-nums"
          />
        </div>
      );
    }

    if (feature.controlType === "action-group") {
      return (
        <div key={feature.id} className="grid gap-1">
          <FieldLabel>{feature.label}</FieldLabel>
          <div className="grid gap-1">
            {(feature.options ?? []).map((option) => {
              const Icon = option.icon;
              return (
                <ToolbarOption
                  key={option.value}
                  title={option.label}
                  onClick={() => {
                    commitFeature(feature, option.value);
                    setActiveSubgroupId(null);
                  }}
                >
                  {Icon ? <ToolbarIcon icon={Icon} /> : null}
                  <span>{option.label}</span>
                </ToolbarOption>
              );
            })}
          </div>
        </div>
      );
    }

    if (feature.controlType === "custom-css") {
      return <CustomCssControl key={feature.id} onCommit={onStyleChange} />;
    }

    return (
      <div key={feature.id} className="grid gap-1">
        <FieldLabel htmlFor={fieldId}>{feature.label}</FieldLabel>
        <Input
          id={fieldId}
          type="text"
          value={currentValue}
          placeholder={feature.placeholder}
          onChange={(event) => commitFeature(feature, event.target.value)}
          className="h-8 rounded-md bg-foreground/[0.03] px-2 text-[13px]"
        />
      </div>
    );
  }
}

function CustomCssControl({
  onCommit,
}: {
  onCommit: (propertyName: string, nextValue: string) => void;
}) {
  const propertyNameId = useId();
  const propertyValueId = useId();
  const [propertyName, setPropertyName] = useState("");
  const [propertyValue, setPropertyValue] = useState("");

  function apply() {
    const normalizedPropertyName = propertyName.trim();
    if (!normalizedPropertyName) {
      return;
    }

    onCommit(normalizedPropertyName, propertyValue.trim());
    setPropertyValue("");
  }

  return (
    <div className="grid gap-2">
      <div className="grid gap-1">
        <FieldLabel htmlFor={propertyNameId}>Property name</FieldLabel>
        <Input
          id={propertyNameId}
          type="text"
          value={propertyName}
          placeholder="e.g. justify-content"
          onChange={(event) => setPropertyName(event.target.value)}
        />
      </div>
      <div className="grid gap-1">
        <FieldLabel htmlFor={propertyValueId}>Property value</FieldLabel>
        <Input
          id={propertyValueId}
          type="text"
          value={propertyValue}
          placeholder="e.g. space-between"
          onChange={(event) => setPropertyValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              apply();
            }
          }}
        />
      </div>
      <Button type="button" variant="outline" disabled={!propertyName.trim()} onClick={apply}>
        Apply property
      </Button>
    </div>
  );
}

function ToolbarTrigger({
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

function IconButton({
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

function ToolbarPanel({
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

function getPanelWidth(subgroup: ElementToolSubgroup): "default" | "medium" | "wide" {
  if (subgroup.features.some((feature) => feature.controlType === "color")) {
    return "wide";
  }
  if (subgroup.features.some((feature) => feature.controlType === "action-group")) {
    return "medium";
  }
  return "default";
}

function shouldUpdateOffset(current: number, next: number) {
  return Math.abs(current - next) >= 0.5;
}

function Divider() {
  return <Separator orientation="vertical" className="mx-1 h-4 bg-foreground/10" />;
}

function PanelTitle({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium uppercase leading-tight tracking-wider text-foreground/40">
      {children}
    </div>
  );
}

function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[10px] font-medium uppercase tracking-wider text-foreground/50"
    >
      {children}
    </label>
  );
}

function ToolbarIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon className="size-3.5" />;
}

function ToolbarOption({
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

export { FloatingToolbar };
