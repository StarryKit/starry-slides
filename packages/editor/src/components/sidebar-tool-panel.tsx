import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Box,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Hash,
  Image as ImageIcon,
  Info,
  Link2,
  Lock,
  Minus,
  MoreHorizontal,
  MousePointerClick,
  Move,
  Palette,
  Plus,
  Square,
  Trash2,
  Type,
  Unlock,
  Wand2,
} from "lucide-react";
import { type ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { CssPropertyRow } from "../lib/collect-css-properties";
import {
  FONT_FAMILY_OPTIONS,
  getColorInputValue,
  isFontFamilySelected,
} from "../lib/style-controls";
import { cn } from "../lib/utils";
import { ChatPanel } from "./chat-panel";
import { ColorPicker } from "./color-picker";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

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
  onDuplicateSelection: () => void;
}

interface AttributeValues {
  name: string;
  locked: string;
  altText: string;
  ariaLabel: string;
  clickAction: string;
  linkUrl: string;
  targetSlide: string;
}

interface InspectorFieldConfig {
  propertyName: string;
  label: string;
  input: "text" | "number" | "select" | "color" | "segmented" | "slider";
  placeholder?: string;
  options?: SelectOption[];
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
}

interface SelectOption {
  label: string;
  value: string;
}

interface InspectorSectionConfig {
  id: string;
  title: string;
  icon: ReactNode;
  fields: InspectorFieldConfig[];
}

const INSPECTOR_SECTIONS: InspectorSectionConfig[] = [
  {
    id: "layout",
    title: "Layout",
    icon: <Move className="size-3.5" />,
    fields: [
      { propertyName: "width", label: "Width", input: "text", placeholder: "320px or auto" },
      { propertyName: "height", label: "Height", input: "text", placeholder: "240px or auto" },
      {
        propertyName: "opacity",
        label: "Opacity",
        input: "slider",
        placeholder: "0 to 1",
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        propertyName: "display",
        label: "Visibility",
        input: "segmented",
        options: [
          { label: "visible", value: "" },
          { label: "hidden", value: "none" },
        ],
      },
    ],
  },
  {
    id: "typography",
    title: "Typography",
    icon: <Type className="size-3.5" />,
    fields: [
      {
        propertyName: "font-family",
        label: "Font family",
        input: "select",
        options: FONT_FAMILY_OPTIONS.map((font) => ({ label: font.label, value: font.value })),
      },
      {
        propertyName: "font-size",
        label: "Font size",
        input: "slider",
        unit: "px",
        min: 0,
        max: 160,
        step: 1,
      },
      {
        propertyName: "font-weight",
        label: "Font weight",
        input: "select",
        options: [
          { label: "unset", value: "" },
          { label: "Light", value: "300" },
          { label: "Regular", value: "400" },
          { label: "Medium", value: "500" },
          { label: "Semibold", value: "600" },
          { label: "Bold", value: "700" },
          { label: "Heavy", value: "800" },
        ],
      },
      {
        propertyName: "line-height",
        label: "Line height",
        input: "slider",
        placeholder: "1.4 or 32px",
        min: 0.8,
        max: 3,
        step: 0.05,
      },
      {
        propertyName: "text-align",
        label: "Text align",
        input: "segmented",
        options: [
          { label: "Left", value: "left" },
          { label: "Center", value: "center" },
          { label: "Right", value: "right" },
        ],
      },
      { propertyName: "color", label: "Text color", input: "color" },
    ],
  },
  {
    id: "fill",
    title: "Fill",
    icon: <Palette className="size-3.5" />,
    fields: [{ propertyName: "background-color", label: "Background color", input: "color" }],
  },
  {
    id: "border",
    title: "Shape",
    icon: <Box className="size-3.5" />,
    fields: [
      { propertyName: "border", label: "Border", input: "text", placeholder: "1px solid #d1c1ae" },
      { propertyName: "border-radius", label: "Radius", input: "text", placeholder: "16px" },
      {
        propertyName: "box-shadow",
        label: "Shadow",
        input: "text",
        placeholder: "0 12px 30px rgba(...)",
      },
    ],
  },
];

const DEFAULT_OPEN_SECTIONS = new Set<string>(["layout", "typography", "fill"]);
const STYLE_CHANGE_DEBOUNCE_MS = 750;
const EMPTY_SELECT_VALUE = "__empty__";
const FALLBACK_CUSTOM_PROPERTY_SECTION_ID = "custom";

function toStyleMap(inspectedStyles: CssPropertyRow[]): Map<string, string> {
  return new Map(inspectedStyles.map((property) => [property.name, property.value]));
}

function normalizeNumberInput(rawValue: string, unit: string | undefined) {
  const trimmed = rawValue.trim();
  if (trimmed.length === 0) {
    return "";
  }

  return unit ? `${trimmed}${unit}` : trimmed;
}

function getInputValue(value: string, field: InspectorFieldConfig) {
  if (
    (field.input === "number" || field.input === "slider") &&
    field.unit &&
    value.endsWith(field.unit)
  ) {
    return value.slice(0, -field.unit.length);
  }

  if (field.input === "color") {
    return getColorInputValue(value);
  }

  return value;
}

function getSelectValue(value: string, field: InspectorFieldConfig): string {
  if (field.propertyName === "font-family") {
    return (
      field.options?.find((option) => isFontFamilySelected(value, option.value))?.value ?? value
    );
  }

  if (field.propertyName === "display") {
    return value === "none" ? "none" : "";
  }

  if (field.propertyName === "text-align" && value === "start") {
    return "left";
  }

  return value;
}

function getSelectOptions(value: string, field: InspectorFieldConfig): SelectOption[] {
  const options = field.options ?? [{ label: "unset", value: "" }];
  const selectValue = getSelectValue(value, field);
  const hasMatchingOption = options.some((option) => option.value === selectValue);

  if (hasMatchingOption) {
    return options;
  }

  return [{ label: value || "unset", value }, ...options];
}

function getChangeValue(nextRawValue: string, field: InspectorFieldConfig) {
  if (field.input === "number" || field.input === "slider") {
    return normalizeNumberInput(nextRawValue, field.unit);
  }

  return nextRawValue;
}

function commitDraftValue(
  propertyName: string,
  draftValue: string | undefined,
  inspectedValue: string,
  onStyleChange: (propertyName: string, nextValue: string) => void
) {
  if (draftValue === undefined) {
    return;
  }

  const normalizedDraft = (draftValue ?? "").trim();
  const normalizedCurrent = inspectedValue.trim();

  if (normalizedDraft === normalizedCurrent) {
    return;
  }

  onStyleChange(propertyName, normalizedDraft);
}

function parseNumericValue(value: string, fallback: number) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

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
  onDuplicateSelection,
}: SidebarToolPanelProps) {
  const panelBaseId = useId();
  const styleMap = useMemo(() => toStyleMap(inspectedStyles), [inspectedStyles]);
  const [openSectionIds, setOpenSectionIds] = useState<Set<string>>(DEFAULT_OPEN_SECTIONS);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [customPropertyName, setCustomPropertyName] = useState("");
  const [customPropertyValue, setCustomPropertyValue] = useState("");
  const [activeTab, setActiveTab] = useState<"edit" | "chat">("edit");
  const isStyleEditingDisabled =
    !canEditStyles || isEditingText || attributeValues.locked === "true";
  const editingTargetId = selectedElementId ?? "slide-root";
  const customPropertyNameId = `${panelBaseId}-custom-property-name`;
  const customPropertyValueId = `${panelBaseId}-custom-property-value`;
  const hidden =
    getSelectValue(styleMap.get("display") ?? "", {
      propertyName: "display",
      label: "Visibility",
      input: "segmented",
    }) === "none";
  const displayType =
    selectedElementLabel || getDefaultElementType(selectedElementType, selectedElementId);

  useEffect(() => {
    void editingTargetId;
    setDraftValues({});
    setCustomPropertyName("");
    setCustomPropertyValue("");
  }, [editingTargetId]);

  useEffect(() => {
    const draftEntries = Object.entries(draftValues);
    if (draftEntries.length === 0 || isStyleEditingDisabled) {
      return;
    }

    const timer = window.setTimeout(() => {
      for (const [propertyName, draftValue] of draftEntries) {
        commitDraftValue(propertyName, draftValue, styleMap.get(propertyName) ?? "", onStyleChange);
      }

      setDraftValues((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };
        for (const [propertyName, draftValue] of draftEntries) {
          if (nextDrafts[propertyName] === draftValue) {
            delete nextDrafts[propertyName];
          }
        }
        return nextDrafts;
      });
    }, STYLE_CHANGE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [draftValues, isStyleEditingDisabled, onStyleChange, styleMap]);

  const commitField = (field: InspectorFieldConfig) => {
    commitDraftValue(
      field.propertyName,
      draftValues[field.propertyName],
      styleMap.get(field.propertyName) ?? "",
      onStyleChange
    );
  };

  const renderField = (field: InspectorFieldConfig) => {
    const currentValue = styleMap.get(field.propertyName) ?? "";
    const draftValue = draftValues[field.propertyName];
    const rawInputValue = getInputValue(draftValue ?? currentValue, field);
    const inputValue =
      field.input === "slider"
        ? String(
            parseNumericValue(
              rawInputValue,
              field.propertyName === "opacity" ? 1 : (field.min ?? 0)
            )
          )
        : rawInputValue;
    const fieldInputId = `${panelBaseId}-${field.propertyName}`;

    return (
      <Row label={field.label} key={field.propertyName}>
        {field.input === "select" ? (
          <Select
            value={getSelectValue(draftValue ?? currentValue, field) || EMPTY_SELECT_VALUE}
            disabled={isStyleEditingDisabled}
            onValueChange={(nextValue) => {
              commitDraftValue(
                field.propertyName,
                nextValue === EMPTY_SELECT_VALUE ? "" : nextValue,
                currentValue,
                onStyleChange
              );
            }}
          >
            <SelectTrigger
              id={fieldInputId}
              aria-label={field.label}
              size="sm"
              className="h-8 flex-1 rounded-md border-transparent bg-foreground/[0.03] px-2 text-xs shadow-none hover:bg-foreground/[0.06]"
              data-value={getSelectValue(draftValue ?? currentValue, field)}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {getSelectOptions(draftValue ?? currentValue, field).map((option) => (
                  <SelectItem
                    key={option.value || EMPTY_SELECT_VALUE}
                    value={option.value || EMPTY_SELECT_VALUE}
                    data-testid={`${field.propertyName}-option`}
                    data-value={option.value}
                    style={
                      field.propertyName === "font-family" && option.value
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
        ) : field.input === "segmented" ? (
          <SegmentedControl
            value={getSelectValue(draftValue ?? currentValue, field)}
            options={field.options ?? []}
            disabled={isStyleEditingDisabled}
            onChange={(nextValue) => {
              commitDraftValue(field.propertyName, nextValue, currentValue, onStyleChange);
            }}
          />
        ) : field.input === "color" ? (
          <ColorSwatch
            value={inputValue}
            disabled={isStyleEditingDisabled}
            onChange={(nextValue) => {
              commitDraftValue(field.propertyName, nextValue, currentValue, onStyleChange);
            }}
          />
        ) : field.input === "slider" ? (
          <NumberSlider
            id={fieldInputId}
            label={field.label}
            value={parseNumericValue(
              inputValue,
              field.propertyName === "opacity" ? 1 : (field.min ?? 0)
            )}
            min={field.min ?? 0}
            max={field.max ?? 100}
            step={field.step ?? 1}
            suffix={field.unit ?? ""}
            disabled={isStyleEditingDisabled}
            onChange={(nextValue) => {
              const nextRawValue = getChangeValue(String(nextValue), field);
              setDraftValues((current) => ({ ...current, [field.propertyName]: nextRawValue }));
            }}
            onCommit={() => commitField(field)}
          />
        ) : (
          <div className="flex flex-1 items-center gap-2">
            <input
              id={fieldInputId}
              aria-label={field.label}
              className="h-8 min-w-0 flex-1 rounded-md border border-transparent bg-foreground/[0.03] px-2 text-xs font-medium outline-none transition hover:bg-foreground/[0.05] focus:bg-white focus:border-foreground/20 disabled:cursor-not-allowed disabled:opacity-50"
              type={field.input === "number" ? "number" : "text"}
              value={inputValue}
              min={field.min}
              step={field.step}
              placeholder={field.placeholder}
              disabled={isStyleEditingDisabled}
              onChange={(event) => {
                const nextValue = getChangeValue(event.target.value, field);
                setDraftValues((current) => ({ ...current, [field.propertyName]: nextValue }));
              }}
              onBlur={() => commitField(field)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitField(field);
                  event.currentTarget.blur();
                }
              }}
            />
            {field.unit ? (
              <span className="text-[10px] font-medium text-foreground/40">{field.unit}</span>
            ) : null}
          </div>
        )}
      </Row>
    );
  };

  const applyCustomProperty = () => {
    const propertyName = customPropertyName.trim();
    if (!propertyName) {
      return;
    }

    onStyleChange(propertyName, customPropertyValue.trim());
    setCustomPropertyValue("");
  };

  return (
    <section
      className={cn(
        "flex h-full min-h-0 w-[340px] max-w-[340px] flex-[0_0_340px] flex-col overflow-hidden border-l border-foreground/[0.08] bg-white font-sans opacity-100 transition-[width,max-width,opacity] duration-200 max-[1200px]:h-[70vh] max-[1200px]:flex-none max-[1200px]:border-t",
        !isOpen && "w-0 max-w-0 pointer-events-none opacity-0"
      )}
      data-testid="sidebar-tool-panel"
      aria-hidden={isOpen ? "false" : "true"}
    >
      <div className="border-b border-foreground/[0.06] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-foreground/[0.06] bg-foreground/[0.04] text-foreground/75">
              {selectedElementType === "text" ? (
                <Type className="size-3.5" />
              ) : selectedElementType === "image" ? (
                <ImageIcon className="size-3.5" />
              ) : (
                <Square className="size-3.5" />
              )}
            </div>
            <div className="min-w-0 flex-1 truncate rounded bg-transparent px-1.5 py-1 -mx-1.5 text-xs font-semibold capitalize">
              {displayType}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <IconButton
              title={attributeValues.locked === "true" ? "Unlock element" : "Lock element"}
              active={attributeValues.locked === "true"}
              onClick={() =>
                onAttributeChange(
                  "data-editor-locked",
                  attributeValues.locked === "true" ? "" : "true"
                )
              }
            >
              {attributeValues.locked === "true" ? (
                <Lock className="size-3.5" />
              ) : (
                <Unlock className="size-3.5" />
              )}
            </IconButton>
            <IconButton
              title={hidden ? "Show element" : "Hide element"}
              active={hidden}
              onClick={() => onStyleChange("display", hidden ? "" : "none")}
            >
              {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </IconButton>
            <IconButton
              title="More"
              onClick={() => {
                setOpenSectionIds((current) => {
                  const next = new Set(current);
                  if (next.has(FALLBACK_CUSTOM_PROPERTY_SECTION_ID)) {
                    next.delete(FALLBACK_CUSTOM_PROPERTY_SECTION_ID);
                  } else {
                    next.add(FALLBACK_CUSTOM_PROPERTY_SECTION_ID);
                  }
                  return next;
                });
              }}
            >
              <MoreHorizontal className="size-3.5" />
            </IconButton>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value === "chat" ? "chat" : "edit");
          }}
          className="mt-3 min-h-0 gap-0"
        >
          <TabsList
            aria-label="Inspector tabs"
            className="grid h-auto w-full grid-cols-2 gap-0.5 rounded-md bg-foreground/[0.04] p-0.5"
          >
            <TabsTrigger
              value="edit"
              className="h-7 rounded text-[11px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Edit
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="h-7 rounded text-[11px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Chat
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isEditingText ? (
        <p className="mx-4 mt-3 rounded-md border border-foreground/[0.06] bg-foreground/[0.03] px-3 py-2 text-[12px] leading-normal text-foreground/65">
          Editing text. Press Enter to save or Escape to cancel.
        </p>
      ) : null}

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value === "chat" ? "chat" : "edit");
        }}
        className="min-h-0 flex-1 gap-0"
      >
        <TabsContent value="edit" className="min-h-0 overflow-y-auto p-0">
          {INSPECTOR_SECTIONS.map((section) => (
            <Section
              key={section.id}
              icon={section.icon}
              title={section.title}
              open={openSectionIds.has(section.id)}
              onOpenChange={(nextOpen) => {
                setOpenSectionIds((current) => {
                  const next = new Set(current);
                  if (nextOpen) {
                    next.add(section.id);
                  } else {
                    next.delete(section.id);
                  }
                  return next;
                });
              }}
            >
              {section.fields.map(renderField)}
            </Section>
          ))}

          <Section
            icon={<MousePointerClick className="size-3.5" />}
            title="Interaction"
            open={openSectionIds.has("interaction")}
            onOpenChange={(nextOpen) => {
              setOpenSectionIds((current) => toggleSetValue(current, "interaction", nextOpen));
            }}
          >
            <AttributeSelect
              label="Action"
              value={attributeValues.clickAction || "none"}
              options={[
                { label: "None", value: "none" },
                { label: "Next slide", value: "next" },
                { label: "Previous slide", value: "prev" },
                { label: "Go to slide", value: "slide" },
                { label: "Open link", value: "url" },
              ]}
              disabled={isStyleEditingDisabled}
              onChange={(nextValue) =>
                onAttributeChange("data-click-action", nextValue === "none" ? "" : nextValue)
              }
            />
            {attributeValues.clickAction === "url" ? (
              <AttributeInput
                label="Link"
                value={attributeValues.linkUrl}
                placeholder="https://"
                disabled={isStyleEditingDisabled}
                onCommit={(nextValue) => onAttributeChange("data-link-url", nextValue)}
              />
            ) : null}
            {attributeValues.clickAction === "slide" ? (
              <AttributeInput
                label="Slide"
                value={attributeValues.targetSlide}
                placeholder="slide-2"
                disabled={isStyleEditingDisabled}
                onCommit={(nextValue) => onAttributeChange("data-target-slide", nextValue)}
              />
            ) : null}
          </Section>

          <Section
            icon={<Info className="size-3.5" />}
            title="Accessibility"
            open={openSectionIds.has("accessibility")}
            onOpenChange={(nextOpen) => {
              setOpenSectionIds((current) => toggleSetValue(current, "accessibility", nextOpen));
            }}
          >
            <AttributeInput
              label="Alt text"
              value={attributeValues.altText}
              placeholder="Describe this element"
              disabled={isStyleEditingDisabled}
              onCommit={(nextValue) => onAttributeChange("alt", nextValue)}
            />
            <AttributeInput
              label="ARIA"
              value={attributeValues.ariaLabel}
              placeholder="aria-label"
              disabled={isStyleEditingDisabled}
              onCommit={(nextValue) => onAttributeChange("aria-label", nextValue)}
            />
          </Section>

          <Section
            icon={<Hash className="size-3.5" />}
            title="Custom CSS"
            open={openSectionIds.has(FALLBACK_CUSTOM_PROPERTY_SECTION_ID)}
            onOpenChange={(nextOpen) => {
              setOpenSectionIds((current) =>
                toggleSetValue(current, FALLBACK_CUSTOM_PROPERTY_SECTION_ID, nextOpen)
              );
            }}
          >
            <label className="grid gap-1.5" htmlFor={customPropertyNameId}>
              <span className="text-[10px] font-medium uppercase tracking-wider text-foreground/50">
                Property name
              </span>
              <input
                id={customPropertyNameId}
                type="text"
                value={customPropertyName}
                placeholder="e.g. justify-content"
                disabled={isStyleEditingDisabled}
                onChange={(event) => setCustomPropertyName(event.target.value)}
                className="h-8 rounded-md border border-transparent bg-foreground/[0.03] px-2 text-xs outline-none transition focus:bg-white focus:border-foreground/20 disabled:opacity-50"
              />
            </label>
            <label className="grid gap-1.5" htmlFor={customPropertyValueId}>
              <span className="text-[10px] font-medium uppercase tracking-wider text-foreground/50">
                Property value
              </span>
              <input
                id={customPropertyValueId}
                type="text"
                value={customPropertyValue}
                placeholder="e.g. space-between"
                disabled={isStyleEditingDisabled}
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
            <button
              className="h-9 rounded-md border border-foreground/[0.06] bg-foreground/[0.03] text-xs font-medium transition hover:bg-foreground/[0.07] disabled:pointer-events-none disabled:opacity-50"
              type="button"
              disabled={isStyleEditingDisabled || customPropertyName.trim().length === 0}
              onClick={applyCustomProperty}
            >
              Apply property
            </button>
          </Section>

          <Section
            icon={<Wand2 className="size-3.5" />}
            title="Actions"
            open={openSectionIds.has("actions")}
            onOpenChange={(nextOpen) => {
              setOpenSectionIds((current) => toggleSetValue(current, "actions", nextOpen));
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              <button
                className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-foreground/[0.06] bg-foreground/[0.03] text-xs font-medium transition hover:bg-foreground/[0.07]"
                type="button"
                disabled={!selectedElementId}
                onClick={onDuplicateSelection}
              >
                <Copy className="size-3.5" />
                Copy
              </button>
              <button
                className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-red-100 bg-red-50 text-xs font-medium text-red-600 transition hover:bg-red-100"
                type="button"
                disabled={!selectedElementId}
                onClick={() => onStyleChange("display", "none")}
              >
                <Trash2 className="size-3.5" />
                Delete
              </button>
            </div>
          </Section>
          <div className="h-4" />
        </TabsContent>
        <TabsContent value="chat" className="min-h-0 overflow-y-auto p-4">
          <ChatPanel />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function getDefaultElementType(
  type: SidebarToolPanelProps["selectedElementType"],
  selectedElementId: string | null
) {
  if (!selectedElementId) {
    return "slide";
  }

  return type;
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
  icon,
  title,
  open,
  onOpenChange,
  children,
}: {
  icon: ReactNode;
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
          <span className="text-foreground/40 transition group-hover:text-foreground/70">
            {icon}
          </span>
          <span className="text-xs font-semibold tracking-wide">{title}</span>
        </div>
        <ChevronDown
          className={cn("size-3.5 text-foreground/30 transition-transform", open && "rotate-180")}
        />
      </button>
      <div className={cn("grid transition-all", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <div className="space-y-2 px-4 pt-1 pb-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[10px] font-medium uppercase tracking-wider text-foreground/50">
        {label}
      </span>
      {children}
    </div>
  );
}

function NumberSlider({
  id,
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  disabled,
  onChange,
  onCommit,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  disabled: boolean;
  onChange: (value: number) => void;
  onCommit: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));

  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el || disabled) {
        return;
      }

      const rect = el.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      let nextValue = min + p * (max - min);
      nextValue = Math.round(nextValue / step) * step;
      nextValue = Math.max(min, Math.min(max, nextValue));
      onChange(Number(nextValue.toFixed(4)));
    },
    [disabled, max, min, onChange, step]
  );

  useEffect(() => {
    if (!dragging) {
      return;
    }

    const onMove = (event: MouseEvent) => setFromClientX(event.clientX);
    const onUp = () => {
      setDragging(false);
      onCommit();
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, onCommit, setFromClientX]);

  const display = `${Math.round(value * 100) / 100}${suffix}`;

  return (
    <div className="flex flex-1 items-center gap-1.5">
      <div
        ref={trackRef}
        onMouseDown={(event) => {
          if (disabled) {
            return;
          }
          setDragging(true);
          setFromClientX(event.clientX);
        }}
        className={cn(
          "relative h-7 flex-1 cursor-ew-resize select-none overflow-hidden rounded-md border border-transparent bg-foreground/[0.04] transition hover:bg-foreground/[0.06]",
          dragging && "border-foreground/10 bg-foreground/[0.08]",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <div
          className="pointer-events-none absolute inset-y-0 left-0 bg-foreground/[0.12]"
          style={{ width: `${pct * 100}%` }}
        />
        <div
          className="pointer-events-none absolute inset-y-1 w-px bg-foreground/60 transition-[left]"
          style={{ left: `calc(${pct * 100}% - 0.5px)` }}
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-medium tabular-nums text-foreground/70">{display}</span>
        </div>
      </div>
      <div className="flex h-7 w-16 items-center rounded-md border border-transparent bg-foreground/[0.03] transition hover:bg-foreground/[0.05] focus-within:bg-white focus-within:border-foreground/20">
        <button
          type="button"
          className="flex h-full w-5 items-center justify-center text-foreground/40 hover:text-foreground disabled:opacity-40"
          disabled={disabled}
          onClick={() => {
            onChange(Math.max(min, Number((value - step).toFixed(4))));
            window.setTimeout(onCommit, 0);
          }}
        >
          <Minus className="size-3" />
        </button>
        <input
          id={id}
          aria-label={label}
          type="number"
          value={Math.round(value * 100) / 100}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            if (!Number.isNaN(nextValue)) {
              onChange(Math.max(min, Math.min(max, nextValue)));
            }
          }}
          onBlur={onCommit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onCommit();
              event.currentTarget.blur();
            }
          }}
          className="w-full bg-transparent text-center text-[11px] font-medium tabular-nums outline-none [appearance:textfield] disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          className="flex h-full w-5 items-center justify-center text-foreground/40 hover:text-foreground disabled:opacity-40"
          disabled={disabled}
          onClick={() => {
            onChange(Math.min(max, Number((value + step).toFixed(4))));
            window.setTimeout(onCommit, 0);
          }}
        >
          <Plus className="size-3" />
        </button>
      </div>
    </div>
  );
}

function SegmentedControl({
  value,
  options,
  disabled,
  onChange,
}: {
  value: string;
  options: SelectOption[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div
      className="grid flex-1 gap-0.5 rounded-md bg-foreground/[0.03] p-0.5"
      style={{ gridTemplateColumns: `repeat(${Math.max(options.length, 1)}, minmax(0,1fr))` }}
    >
      {options.map((option) => (
        <button
          key={option.value || EMPTY_SELECT_VALUE}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-7 rounded px-1 text-[10px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
            value === option.value
              ? "bg-white text-foreground shadow-sm"
              : "text-foreground/50 hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ColorSwatch({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex h-8 w-full items-center gap-2 rounded-md border border-transparent bg-foreground/[0.03] px-2 transition hover:bg-foreground/[0.06] hover:border-foreground/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          className="size-5 shrink-0 rounded border border-foreground/10"
          style={{ background: value }}
        />
        <span className="truncate font-mono text-[11px] font-medium text-foreground/70">
          {value.startsWith("linear") ? "Gradient" : value.toUpperCase()}
        </span>
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close color picker"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border border-border bg-popover p-3 shadow-md">
            <ColorPicker value={value} onChange={onChange} />
          </div>
        </>
      ) : null}
    </div>
  );
}

function AttributeInput({
  label,
  value,
  placeholder,
  disabled,
  onCommit,
}: {
  label: string;
  value: string;
  placeholder: string;
  disabled: boolean;
  onCommit: (value: string) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    if (draft.trim() !== value.trim()) {
      onCommit(draft);
    }
  };

  return (
    <Row label={label}>
      <input
        id={id}
        aria-label={label}
        value={draft}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
            event.currentTarget.blur();
          }
        }}
        className="h-8 min-w-0 flex-1 rounded-md border border-transparent bg-foreground/[0.03] px-2 text-xs outline-none transition focus:bg-white focus:border-foreground/20 disabled:opacity-50"
      />
    </Row>
  );
}

function AttributeSelect({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Row label={label}>
      <SegmentedControl value={value} options={options} disabled={disabled} onChange={onChange} />
    </Row>
  );
}

function IconButton({
  title,
  active,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md transition",
        active
          ? "bg-foreground text-background"
          : "text-foreground/50 hover:bg-foreground/[0.05] hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export { SidebarToolPanel };
