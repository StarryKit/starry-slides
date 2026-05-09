import type { EditableType } from "../../core";
import type { CssPropertyRow } from "../lib/collect-css-properties";
import type { ElementToolFeature } from "../lib/element-tool-model";

export interface FloatingToolbarProps {
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

export interface AttributeValues {
  locked: string;
  ariaLabel: string;
  linkUrl: string;
}

export interface SelectionCommandAvailability {
  group: boolean;
  ungroup: boolean;
}

export type EditableAttributeId = "other-link" | "other-aria-label";

export const OTHER_FEATURES: Record<EditableAttributeId, ElementToolFeature> = {
  "other-aria-label": {
    id: "other-aria-label",
    label: "ARIA label",
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

export const toolbarIconClassName = "size-3.5";
export const toolbarIconMutedClassName = "size-3.5 text-foreground/55";
export const toolbarIconDropShadowClassName = "size-3.5 drop-shadow";
export const ICON_STROKE_WIDTH = 2.5;
export const menuItemClassName =
  "flex min-h-7 w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[12px] text-foreground/70 outline-none transition-colors hover:bg-foreground/[0.05] hover:text-foreground focus-visible:bg-foreground/[0.06] focus-visible:text-foreground focus-visible:ring-[2px] focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-40";
export const toolbarIconButtonClassName =
  "size-7.5 rounded-xl text-foreground/60 transition-colors hover:bg-foreground/[0.05] hover:text-foreground active:scale-[0.98]";
export const toolbarIconButtonActiveClassName =
  "bg-foreground/[0.07] text-foreground shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] hover:bg-foreground/[0.08]";
