import { PanelTopOpen, Square, Type } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useId, useState } from "react";
import type { ReactNode } from "react";
import type { CssPropertyRow } from "../lib/collect-css-properties";
import { ELEMENT_TOOL_GROUPS, type ElementToolFeature } from "../lib/element-tool-model";
import {
  getElementToolValue,
  getFeatureOptions,
  getTextDecorationCommitValue,
  isFeatureActive,
  normalizeFeatureCommitValue,
} from "../lib/element-tool-values";
import { cn } from "../lib/utils";
import { ColorPicker } from "./color-picker";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface SidebarToolPanelProps {
  inspectedStyles: CssPropertyRow[];
  isEditingText: boolean;
  isOpen: boolean;
  canEditStyles: boolean;
  selectedElementId: string | null;
  selectedElementType: "text" | "image" | "block";
  selectedElementLabel: string;
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
const DEFAULT_OPEN_GROUPS = new Set(["typography", "appearance", "layout"]);

function SidebarToolPanel({
  inspectedStyles,
  isEditingText,
  isOpen,
  canEditStyles,
  selectedElementId,
  selectedElementType,
  selectedElementLabel,
  attributeValues,
  onStyleChange,
  onAttributeChange,
  onAlignToSlide,
  onLayerOrder,
  onModeChange,
}: SidebarToolPanelProps) {
  const panelBaseId = useId();
  const [openGroupIds, setOpenGroupIds] = useState<Set<string>>(DEFAULT_OPEN_GROUPS);
  const [customPropertyName, setCustomPropertyName] = useState("");
  const [customPropertyValue, setCustomPropertyValue] = useState("");
  const isDisabled = !canEditStyles || isEditingText || attributeValues.locked === "true";
  const displayType = selectedElementLabel || (selectedElementId ? selectedElementType : "slide");

  function commitFeature(feature: ElementToolFeature, nextValue: string) {
    if (feature.target === "style" && feature.propertyName) {
      if (feature.id === "font-underline") {
        onStyleChange(
          feature.propertyName,
          getTextDecorationCommitValue(
            getElementToolValue({ feature, inspectedStyles, attributeValues }),
            "underline",
            nextValue === ""
          )
        );
        return;
      }

      if (feature.id === "font-strikethrough") {
        onStyleChange(
          feature.propertyName,
          getTextDecorationCommitValue(
            getElementToolValue({ feature, inspectedStyles, attributeValues }),
            "line-through",
            nextValue === ""
          )
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

  function renderFeature(feature: ElementToolFeature) {
    const currentValue = getElementToolValue({
      feature,
      inspectedStyles,
      attributeValues,
    });
    const fieldId = `${panelBaseId}-${feature.id}`;

    if (feature.controlType === "custom-css") {
      return (
        <div key={feature.id} className="grid gap-2">
          <label className="grid gap-1.5" htmlFor={`${fieldId}-name`}>
            <span className="text-[10px] font-medium uppercase tracking-wider text-foreground/50">
              Property name
            </span>
            <input
              id={`${fieldId}-name`}
              type="text"
              value={customPropertyName}
              placeholder="e.g. justify-content"
              disabled={isDisabled}
              onChange={(event) => setCustomPropertyName(event.target.value)}
              className="h-8 rounded-md border border-transparent bg-foreground/[0.03] px-2 text-xs outline-none transition focus:bg-white focus:border-foreground/20 disabled:opacity-50"
            />
          </label>
          <label className="grid gap-1.5" htmlFor={`${fieldId}-value`}>
            <span className="text-[10px] font-medium uppercase tracking-wider text-foreground/50">
              Property value
            </span>
            <input
              id={`${fieldId}-value`}
              type="text"
              value={customPropertyValue}
              placeholder="e.g. space-between"
              disabled={isDisabled}
              onChange={(event) => setCustomPropertyValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyCustomProperty();
                }
              }}
              className="h-8 rounded-md border border-transparent bg-foreground/[0.03] px-2 text-xs outline-none transition focus:bg-white focus:border-foreground/20 disabled:opacity-50"
            />
          </label>
          <Button
            type="button"
            variant="outline"
            disabled={isDisabled || customPropertyName.trim().length === 0}
            onClick={applyCustomProperty}
          >
            Apply property
          </Button>
        </div>
      );
    }

    if (feature.controlType === "select") {
      const options = getFeatureOptions(feature, currentValue);
      return (
        <Row key={feature.id} label={feature.label}>
          <Select
            value={currentValue || EMPTY_SELECT_VALUE}
            disabled={isDisabled}
            onValueChange={(nextValue) => {
              commitFeature(feature, nextValue === EMPTY_SELECT_VALUE ? "" : nextValue);
            }}
          >
            <SelectTrigger
              id={fieldId}
              aria-label={feature.label}
              size="sm"
              className="h-8 flex-1 rounded-md border-transparent bg-foreground/[0.03] px-2 text-xs shadow-none hover:bg-foreground/[0.06]"
              data-value={currentValue}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {options.map((option) => (
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
        </Row>
      );
    }

    if (feature.controlType === "color") {
      return (
        <Row key={feature.id} label={feature.label}>
          <ColorControl
            id={fieldId}
            label={feature.label}
            value={currentValue}
            disabled={isDisabled}
            onChange={(nextValue) => commitFeature(feature, nextValue)}
          />
        </Row>
      );
    }

    if (feature.controlType === "slider" || feature.controlType === "number") {
      return (
        <Row key={feature.id} label={feature.label}>
          <input
            id={fieldId}
            aria-label={feature.label}
            type="number"
            min={feature.min}
            max={feature.max}
            step={feature.step}
            value={currentValue}
            disabled={isDisabled}
            onChange={(event) => commitFeature(feature, event.target.value)}
            className="h-8 min-w-0 flex-1 rounded-md border border-transparent bg-foreground/[0.03] px-2 text-xs font-medium outline-none transition hover:bg-foreground/[0.05] focus:bg-white focus:border-foreground/20 disabled:cursor-not-allowed disabled:opacity-50"
          />
          {feature.unit ? (
            <span className="text-[10px] font-medium text-foreground/40">{feature.unit}</span>
          ) : null}
        </Row>
      );
    }

    if (feature.controlType === "toggle") {
      const active = isFeatureActive(feature, currentValue);
      return (
        <Row key={feature.id} label={feature.label}>
          <Button
            type="button"
            variant={active ? "secondary" : "outline"}
            disabled={!canEditStyles || isEditingText}
            aria-label={feature.label}
            aria-pressed={active}
            onClick={() => {
              commitFeature(feature, active ? "" : "true");
            }}
          >
            {active ? "On" : "Off"}
          </Button>
        </Row>
      );
    }

    if (feature.controlType === "action-group") {
      return (
        <div key={feature.id} className="grid gap-1.5">
          <div className="text-[10px] font-medium uppercase tracking-wider text-foreground/50">
            {feature.label}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(feature.options ?? []).map((option) => {
              const Icon = option.icon;
              const active = currentValue === option.value;
              return (
                <Button
                  key={option.value}
                  type="button"
                  variant={active ? "secondary" : "outline"}
                  disabled={isDisabled}
                  aria-label={option.label}
                  title={option.label}
                  onClick={() => commitFeature(feature, option.value)}
                >
                  {Icon ? <Icon /> : null}
                  <span className="truncate">{option.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <Row key={feature.id} label={feature.label}>
        <input
          id={fieldId}
          aria-label={feature.label}
          className="h-8 min-w-0 flex-1 rounded-md border border-transparent bg-foreground/[0.03] px-2 text-xs font-medium outline-none transition hover:bg-foreground/[0.05] focus:bg-white focus:border-foreground/20 disabled:cursor-not-allowed disabled:opacity-50"
          type="text"
          value={currentValue}
          placeholder={feature.placeholder}
          disabled={isDisabled}
          onChange={(event) => commitFeature(feature, event.target.value)}
        />
      </Row>
    );
  }

  function applyCustomProperty() {
    const propertyName = customPropertyName.trim();
    if (!propertyName) {
      return;
    }

    onStyleChange(propertyName, customPropertyValue.trim());
    setCustomPropertyValue("");
  }

  return (
    <section
      className={cn(
        "flex h-full min-h-0 w-[340px] max-w-[340px] flex-[0_0_340px] flex-col overflow-hidden border-l border-foreground/[0.08] bg-white font-sans opacity-100 transition-[width,max-width,opacity] duration-200 max-[1200px]:h-[70vh] max-[1200px]:flex-none max-[1200px]:border-t",
        !isOpen && "hidden w-0 max-w-0 pointer-events-none opacity-0"
      )}
      data-testid="sidebar-tool-panel"
      aria-hidden={isOpen ? "false" : "true"}
    >
      <div className="border-b border-foreground/[0.06] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-foreground/[0.06] bg-foreground/[0.04] text-foreground/75">
              <ElementTypeIcon type={selectedElementType} />
            </div>
            <div className="min-w-0 flex-1 truncate rounded bg-transparent px-1.5 py-1 -mx-1.5 text-xs font-semibold capitalize">
              {displayType}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Use floating toolbar mode"
            data-testid="tool-mode-floating-button"
            onClick={onModeChange}
          >
            <PanelTopOpen />
          </Button>
        </div>
      </div>

      {isEditingText ? (
        <p className="mx-4 mt-3 rounded-md border border-foreground/[0.06] bg-foreground/[0.03] px-3 py-2 text-[12px] leading-normal text-foreground/65">
          Editing text. Press Enter to save or Escape to cancel.
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto p-0">
        {ELEMENT_TOOL_GROUPS.map((group) => (
          <Section
            key={group.id}
            icon={group.icon}
            title={group.label}
            open={openGroupIds.has(group.id)}
            onOpenChange={(nextOpen) => {
              setOpenGroupIds((current) => toggleSetValue(current, group.id, nextOpen));
            }}
          >
            {group.subgroups.map((subgroup) => (
              <div
                key={subgroup.id}
                className="grid gap-2 rounded-md border border-foreground/[0.06] bg-foreground/[0.015] p-2.5"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/65">
                  <subgroup.icon className="size-3.5 text-foreground/40" />
                  {subgroup.label}
                </div>
                {subgroup.features.map(renderFeature)}
              </div>
            ))}
          </Section>
        ))}
        <div className="h-4" />
      </div>
    </section>
  );
}

function ElementTypeIcon({ type }: { type: SidebarToolPanelProps["selectedElementType"] }) {
  if (type === "text") {
    return <Type className="size-3.5" />;
  }

  return <Square className="size-3.5" />;
}

function toggleSetValue(current: Set<string>, value: string, enabled: boolean) {
  const next = new Set(current);
  if (enabled) {
    next.add(value);
  } else {
    next.delete(value);
  }
  return next;
}

function Section({
  icon: Icon,
  title,
  open,
  onOpenChange,
  children,
}: {
  icon: LucideIcon;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-foreground/[0.05] last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="group flex w-full items-center justify-between px-4 py-2.5 text-left transition hover:bg-foreground/[0.02]"
      >
        <div className="flex items-center gap-2">
          <Icon className="size-3.5 text-foreground/40 transition group-hover:text-foreground/70" />
          <span className="text-xs font-semibold tracking-wide">{title}</span>
        </div>
        <span
          className={cn(
            "text-[11px] font-medium text-foreground/30 transition-transform",
            open && "rotate-180"
          )}
          aria-hidden="true"
        >
          v
        </span>
      </button>
      <div className={cn("grid transition-all", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <div className="flex flex-col gap-2 px-4 pt-1 pb-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-[10px] font-medium uppercase tracking-wider text-foreground/50">
        {label}
      </span>
      {children}
    </div>
  );
}

function ColorControl({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex-1">
      <div className="flex h-8 w-full items-center gap-2 rounded-md border border-transparent bg-foreground/[0.03] px-2 transition-colors hover:border-foreground/[0.08] hover:bg-foreground/[0.06] focus-within:border-foreground/20 focus-within:bg-white">
        <span
          className="size-5 shrink-0 rounded border border-foreground/10"
          style={{ background: value }}
        />
        <input
          id={id}
          aria-label={label}
          className="min-w-0 flex-1 bg-transparent font-mono text-[11px] font-medium text-foreground/70 outline-none disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          spellCheck={false}
          value={value.toUpperCase()}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setOpen(false)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={disabled}
          aria-label="Open color picker"
          onClick={() => setOpen((current) => !current)}
        >
          <span
            className="size-3 rounded-sm border border-foreground/15"
            style={{ background: value }}
          />
        </Button>
      </div>
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close color picker"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-1.5 w-72 rounded-md border border-foreground/[0.08] bg-white p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.06),0_12px_40px_rgba(0,0,0,0.08)]">
            <ColorPicker value={value} onChange={onChange} />
          </div>
        </>
      ) : null}
    </div>
  );
}

export { SidebarToolPanel };
