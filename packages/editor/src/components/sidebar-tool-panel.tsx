import { MessageSquare, SlidersHorizontal } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import type { CssPropertyRow } from "../lib/collect-css-properties";
import { ChatPanel } from "./chat-panel";

interface SidebarToolPanelProps {
  inspectedStyles: CssPropertyRow[];
  isEditingText: boolean;
  isOpen: boolean;
  canEditStyles: boolean;
  selectedElementId: string | null;
  onStyleChange: (propertyName: string, nextValue: string) => void;
}

interface InspectorFieldConfig {
  propertyName: string;
  label: string;
  input: "text" | "number" | "select" | "color";
  placeholder?: string;
  options?: string[];
  unit?: string;
  min?: number;
  step?: number;
}

interface InspectorSectionConfig {
  id: string;
  title: string;
  description: string;
  fields: InspectorFieldConfig[];
}

const INSPECTOR_SECTIONS: InspectorSectionConfig[] = [
  {
    id: "typography",
    title: "Typography",
    description: "Fonts, rhythm, alignment, and text color.",
    fields: [
      { propertyName: "font-family", label: "Font family", input: "text", placeholder: "inherit" },
      {
        propertyName: "font-size",
        label: "Font size",
        input: "number",
        unit: "px",
        min: 0,
        step: 1,
      },
      {
        propertyName: "font-weight",
        label: "Font weight",
        input: "select",
        options: ["", "300", "400", "500", "600", "700", "800"],
      },
      {
        propertyName: "line-height",
        label: "Line height",
        input: "text",
        placeholder: "1.4 or 32px",
      },
      {
        propertyName: "letter-spacing",
        label: "Letter spacing",
        input: "text",
        placeholder: "0.02em",
      },
      {
        propertyName: "text-transform",
        label: "Text transform",
        input: "select",
        options: ["", "none", "uppercase", "lowercase", "capitalize"],
      },
      {
        propertyName: "text-align",
        label: "Text align",
        input: "select",
        options: ["", "left", "center", "right", "justify"],
      },
      { propertyName: "color", label: "Text color", input: "color" },
    ],
  },
  {
    id: "layout",
    title: "Layout",
    description: "Display mode, positioning, size, and transforms.",
    fields: [
      {
        propertyName: "display",
        label: "Display",
        input: "select",
        options: ["", "block", "inline", "inline-block", "flex", "grid", "none"],
      },
      {
        propertyName: "position",
        label: "Position",
        input: "select",
        options: ["", "static", "relative", "absolute", "fixed", "sticky"],
      },
      { propertyName: "width", label: "Width", input: "text", placeholder: "320px or auto" },
      { propertyName: "height", label: "Height", input: "text", placeholder: "240px or auto" },
      { propertyName: "top", label: "Top", input: "text", placeholder: "auto or 0" },
      { propertyName: "right", label: "Right", input: "text", placeholder: "auto or 0" },
      { propertyName: "bottom", label: "Bottom", input: "text", placeholder: "auto or 0" },
      { propertyName: "left", label: "Left", input: "text", placeholder: "auto or 0" },
      { propertyName: "opacity", label: "Opacity", input: "text", placeholder: "0 to 1" },
      {
        propertyName: "transform",
        label: "Transform",
        input: "text",
        placeholder: "translate(24px, 0)",
      },
    ],
  },
  {
    id: "spacing",
    title: "Spacing",
    description: "Outer and inner spacing around the selected element.",
    fields: [
      { propertyName: "margin", label: "Margin", input: "text", placeholder: "24px 32px" },
      { propertyName: "padding", label: "Padding", input: "text", placeholder: "16px 24px" },
    ],
  },
  {
    id: "fill",
    title: "Fill",
    description: "Background paint and color fill.",
    fields: [
      { propertyName: "background-color", label: "Background color", input: "color" },
      {
        propertyName: "background",
        label: "Background",
        input: "text",
        placeholder: "linear-gradient(...)",
      },
    ],
  },
  {
    id: "border",
    title: "Border",
    description: "Border line, radius, and shadow.",
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

const DEFAULT_OPEN_SECTIONS = new Set<string>(["typography", "layout", "custom"]);
const STYLE_CHANGE_DEBOUNCE_MS = 750;

function toStyleMap(inspectedStyles: CssPropertyRow[]): Map<string, string> {
  return new Map(inspectedStyles.map((property) => [property.name, property.value]));
}

function isHexColor(value: string) {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

function toHexChannel(value: string) {
  const numericValue = Math.max(0, Math.min(255, Number.parseInt(value, 10) || 0));
  return numericValue.toString(16).padStart(2, "0");
}

function rgbToHex(value: string) {
  const match = value
    .trim()
    .match(/^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})(?:[\s,/]+[\d.]+)?\s*\)$/i);

  if (!match) {
    return null;
  }

  return `#${toHexChannel(match[1] || "0")}${toHexChannel(match[2] || "0")}${toHexChannel(
    match[3] || "0"
  )}`;
}

function getColorInputValue(value: string) {
  if (isHexColor(value)) {
    return value.trim();
  }

  return rgbToHex(value) ?? "#000000";
}

function normalizeNumberInput(rawValue: string, unit: string | undefined) {
  const trimmed = rawValue.trim();
  if (trimmed.length === 0) {
    return "";
  }

  return unit ? `${trimmed}${unit}` : trimmed;
}

function getInputValue(value: string, field: InspectorFieldConfig) {
  if (field.input === "number" && field.unit && value.endsWith(field.unit)) {
    return value.slice(0, -field.unit.length);
  }

  if (field.input === "color") {
    return getColorInputValue(value);
  }

  return value;
}

function getChangeValue(nextRawValue: string, field: InspectorFieldConfig) {
  if (field.input === "number") {
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

function SidebarToolPanel({
  inspectedStyles,
  isEditingText,
  isOpen,
  canEditStyles,
  selectedElementId,
  onStyleChange,
}: SidebarToolPanelProps) {
  const accordionBaseId = useId();
  const styleMap = useMemo(() => toStyleMap(inspectedStyles), [inspectedStyles]);
  const [openSectionIds, setOpenSectionIds] = useState<Set<string>>(DEFAULT_OPEN_SECTIONS);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [customPropertyName, setCustomPropertyName] = useState("");
  const [customPropertyValue, setCustomPropertyValue] = useState("");
  const [activeTab, setActiveTab] = useState<"edit" | "chat">("edit");
  const isStyleEditingDisabled = !canEditStyles || isEditingText;
  const editingTargetId = selectedElementId ?? "slide-root";

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

  const toggleSection = (sectionId: string) => {
    setOpenSectionIds((currentSections) => {
      const nextSections = new Set(currentSections);
      if (nextSections.has(sectionId)) {
        nextSections.delete(sectionId);
      } else {
        nextSections.add(sectionId);
      }
      return nextSections;
    });
  };

  const renderField = (field: InspectorFieldConfig) => {
    const currentValue = styleMap.get(field.propertyName) ?? "";
    const draftValue = draftValues[field.propertyName];
    const inputValue = getInputValue(draftValue ?? currentValue, field);
    const fieldInputId = `${accordionBaseId}-${field.propertyName}`;

    const commitField = () => {
      commitDraftValue(
        field.propertyName,
        draftValues[field.propertyName],
        currentValue,
        onStyleChange
      );
    };

    return (
      <div className="hse-inspector-field" key={field.propertyName}>
        <label className="hse-inspector-field-label" htmlFor={fieldInputId}>
          {field.label}
        </label>
        {field.input === "select" ? (
          <select
            id={fieldInputId}
            className="hse-inspector-select"
            value={draftValue ?? currentValue}
            disabled={isStyleEditingDisabled}
            onChange={(event) => {
              const nextValue = event.target.value;
              commitDraftValue(field.propertyName, nextValue, currentValue, onStyleChange);
            }}
          >
            {(field.options ?? [""]).map((option) => (
              <option key={option || "__empty__"} value={option}>
                {option || "unset"}
              </option>
            ))}
          </select>
        ) : (
          <div className="hse-inspector-input-row">
            <input
              id={fieldInputId}
              className="hse-inspector-input"
              type={
                field.input === "number" ? "number" : field.input === "color" ? "color" : "text"
              }
              value={inputValue}
              min={field.min}
              step={field.step}
              placeholder={field.placeholder}
              disabled={isStyleEditingDisabled}
              onChange={(event) => {
                const nextValue = getChangeValue(event.target.value, field);
                setDraftValues((current) => ({ ...current, [field.propertyName]: nextValue }));
              }}
              onBlur={commitField}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitField();
                  event.currentTarget.blur();
                }
              }}
            />
            {field.unit ? <span className="hse-inspector-unit">{field.unit}</span> : null}
          </div>
        )}
      </div>
    );
  };

  return (
    <section
      className={isOpen ? "hse-inspector-panel is-open" : "hse-inspector-panel is-closed"}
      data-testid="sidebar-tool-panel"
      aria-hidden={isOpen ? "false" : "true"}
    >
      {isEditingText ? (
        <p className="hse-editing-hint">Editing text. Press Enter to save or Escape to cancel.</p>
      ) : null}

      <div className="hse-inspector-tabs" role="tablist" aria-label="Inspector tabs">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "edit"}
          className={activeTab === "edit" ? "hse-inspector-tab is-active" : "hse-inspector-tab"}
          onClick={() => {
            setActiveTab("edit");
          }}
        >
          <SlidersHorizontal aria-hidden="true" />
          Edit
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "chat"}
          className={activeTab === "chat" ? "hse-inspector-tab is-active" : "hse-inspector-tab"}
          onClick={() => {
            setActiveTab("chat");
          }}
        >
          <MessageSquare aria-hidden="true" />
          Chat
        </button>
      </div>

      {activeTab === "edit" ? (
        <div className="hse-inspector-tab-panel" role="tabpanel">
          <div className="hse-inspector-accordion">
            {INSPECTOR_SECTIONS.map((section) => {
              const isSectionOpen = openSectionIds.has(section.id);
              const panelId = `${accordionBaseId}-${section.id}-panel`;

              return (
                <section
                  key={section.id}
                  className={isSectionOpen ? "hse-inspector-group is-open" : "hse-inspector-group"}
                >
                  <button
                    type="button"
                    className="hse-inspector-group-toggle"
                    aria-expanded={isSectionOpen}
                    aria-controls={panelId}
                    onClick={() => {
                      toggleSection(section.id);
                    }}
                  >
                    <span>
                      <strong>{section.title}</strong>
                      <small>{section.description}</small>
                    </span>
                    <span className="hse-inspector-group-icon" aria-hidden="true">
                      {isSectionOpen ? "−" : "+"}
                    </span>
                  </button>

                  {isSectionOpen ? (
                    <div className="hse-inspector-group-panel" id={panelId}>
                      <div className="hse-inspector-form-grid">
                        {section.fields.map(renderField)}
                      </div>
                    </div>
                  ) : null}
                </section>
              );
            })}

            <section
              className={
                openSectionIds.has("custom") ? "hse-inspector-group is-open" : "hse-inspector-group"
              }
            >
              <button
                type="button"
                className="hse-inspector-group-toggle"
                aria-expanded={openSectionIds.has("custom")}
                aria-controls={`${accordionBaseId}-custom-panel`}
                onClick={() => {
                  toggleSection("custom");
                }}
              >
                <span>
                  <strong>Custom CSS</strong>
                  <small>Add or override any CSS property directly.</small>
                </span>
                <span className="hse-inspector-group-icon" aria-hidden="true">
                  {openSectionIds.has("custom") ? "−" : "+"}
                </span>
              </button>

              {openSectionIds.has("custom") ? (
                <div className="hse-inspector-group-panel" id={`${accordionBaseId}-custom-panel`}>
                  <div className="hse-inspector-custom-grid">
                    <label className="hse-inspector-field">
                      <span className="hse-inspector-field-label">Property name</span>
                      <input
                        className="hse-inspector-input"
                        type="text"
                        value={customPropertyName}
                        placeholder="e.g. justify-content"
                        disabled={isStyleEditingDisabled}
                        onChange={(event) => {
                          setCustomPropertyName(event.target.value);
                        }}
                      />
                    </label>
                    <label className="hse-inspector-field">
                      <span className="hse-inspector-field-label">Property value</span>
                      <input
                        className="hse-inspector-input"
                        type="text"
                        value={customPropertyValue}
                        placeholder="e.g. space-between"
                        disabled={isStyleEditingDisabled}
                        onChange={(event) => {
                          setCustomPropertyValue(event.target.value);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            const propertyName = customPropertyName.trim();
                            if (!propertyName) {
                              return;
                            }
                            onStyleChange(propertyName, customPropertyValue.trim());
                            setCustomPropertyValue("");
                          }
                        }}
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    className="hse-inspector-apply-button"
                    disabled={isStyleEditingDisabled || customPropertyName.trim().length === 0}
                    onClick={() => {
                      onStyleChange(customPropertyName.trim(), customPropertyValue.trim());
                      setCustomPropertyValue("");
                    }}
                  >
                    Apply property
                  </button>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      ) : (
        <div className="hse-inspector-tab-panel hse-chat-tab-panel" role="tabpanel">
          <ChatPanel />
        </div>
      )}
    </section>
  );
}

export { SidebarToolPanel };
