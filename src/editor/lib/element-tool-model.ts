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
  Box,
  CaseSensitive,
  ChevronDown,
  ChevronUp,
  Columns3,
  Eye,
  Group,
  Hash,
  Italic,
  Layers,
  Link2,
  Lock,
  Palette,
  Pilcrow,
  Rows3,
  Square,
  Strikethrough,
  Type,
  Underline,
  Ungroup,
} from "lucide-react";
import type {
  ElementToolFeatureId,
  ElementToolGroup,
  ElementToolOption,
} from "./element-tool-types";
import { FONT_FAMILY_OPTIONS } from "./style-controls";
export type {
  ElementToolControlType,
  ElementToolFeature,
  ElementToolFeatureId,
  ElementToolGroup,
  ElementToolOption,
  ElementToolSubgroup,
} from "./element-tool-types";

export const TEXT_ALIGN_OPTIONS: ElementToolOption[] = [
  { value: "left", label: "Left", icon: AlignLeft },
  { value: "center", label: "Center", icon: AlignCenter },
  { value: "right", label: "Right", icon: AlignRight },
];

export const ALIGN_TO_SLIDE_OPTIONS: ElementToolOption[] = [
  { value: "left", icon: AlignStartHorizontal, label: "Align left" },
  { value: "hcenter", icon: AlignCenterHorizontal, label: "Align horizontal center" },
  { value: "right", icon: AlignEndHorizontal, label: "Align right" },
  { value: "top", icon: AlignStartVertical, label: "Align top" },
  { value: "vcenter", icon: AlignCenterVertical, label: "Align vertical center" },
  { value: "bottom", icon: AlignEndVertical, label: "Align bottom" },
];

export const LAYER_ORDER_OPTIONS: ElementToolOption[] = [
  { value: "front", icon: ArrowUpToLine, label: "Bring to front" },
  { value: "forward", icon: ChevronUp, label: "Bring forward" },
  { value: "backward", icon: ChevronDown, label: "Send backward" },
  { value: "back", icon: ArrowDownToLine, label: "Send to back" },
];

export const DISTRIBUTE_OPTIONS: ElementToolOption[] = [
  { value: "horizontal", icon: Columns3, label: "Distribute horizontally" },
  { value: "vertical", icon: Rows3, label: "Distribute vertically" },
];

export const ELEMENT_TOOL_GROUPS: ElementToolGroup[] = [
  {
    id: "typography",
    label: "Typography",
    icon: Type,
    subgroups: [
      {
        id: "font",
        label: "Font",
        icon: Type,
        features: [
          {
            id: "font-family",
            label: "Font family",
            controlType: "select",
            target: "style",
            propertyName: "font-family",
            options: FONT_FAMILY_OPTIONS.map((font) => ({ label: font.label, value: font.value })),
          },
          {
            id: "font-size",
            label: "Font size",
            controlType: "slider",
            target: "style",
            propertyName: "font-size",
            min: 8,
            max: 200,
            step: 1,
            unit: "px",
          },
          {
            id: "font-bold",
            label: "Bold",
            controlType: "toggle",
            target: "style",
            propertyName: "font-weight",
          },
          {
            id: "font-italic",
            label: "Italic",
            controlType: "toggle",
            target: "style",
            propertyName: "font-style",
          },
          {
            id: "font-underline",
            label: "Underline",
            controlType: "toggle",
            target: "style",
            propertyName: "text-decoration-line",
          },
          {
            id: "font-strikethrough",
            label: "Strikethrough",
            controlType: "toggle",
            target: "style",
            propertyName: "text-decoration-line",
          },
        ],
      },
      {
        id: "paragraph",
        label: "Paragraph",
        icon: Pilcrow,
        features: [
          {
            id: "line-height",
            label: "Line height",
            controlType: "slider",
            target: "style",
            propertyName: "line-height",
            min: 0.8,
            max: 3,
            step: 0.05,
          },
          {
            id: "text-align",
            label: "Text align",
            controlType: "action-group",
            target: "style",
            propertyName: "text-align",
            options: TEXT_ALIGN_OPTIONS,
          },
        ],
      },
    ],
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
    subgroups: [
      {
        id: "fill",
        label: "Fill",
        icon: Palette,
        features: [
          {
            id: "text-color",
            label: "Text color",
            controlType: "color",
            target: "style",
            propertyName: "color",
          },
          {
            id: "background-color",
            label: "Background color",
            controlType: "color",
            target: "style",
            propertyName: "background-color",
          },
        ],
      },
      {
        id: "border",
        label: "Border",
        icon: Box,
        features: [
          {
            id: "border",
            label: "Border",
            controlType: "text",
            target: "style",
            propertyName: "border",
            placeholder: "1px solid #d1c1ae",
          },
          {
            id: "border-radius",
            label: "Border radius",
            controlType: "text",
            target: "style",
            propertyName: "border-radius",
            placeholder: "16px",
          },
          {
            id: "box-shadow",
            label: "Shadow",
            controlType: "text",
            target: "style",
            propertyName: "box-shadow",
            placeholder: "0 12px 30px rgba(...)",
          },
        ],
      },
    ],
  },
  {
    id: "layout",
    label: "Layout",
    icon: Square,
    subgroups: [
      {
        id: "size",
        label: "Size",
        icon: Square,
        features: [
          {
            id: "width",
            label: "Width",
            controlType: "text",
            target: "style",
            propertyName: "width",
            placeholder: "320px or auto",
          },
          {
            id: "height",
            label: "Height",
            controlType: "text",
            target: "style",
            propertyName: "height",
            placeholder: "240px or auto",
          },
        ],
      },
      {
        id: "visibility",
        label: "Visibility",
        icon: Eye,
        features: [
          {
            id: "opacity",
            label: "Opacity",
            controlType: "slider",
            target: "style",
            propertyName: "opacity",
            min: 0,
            max: 1,
            step: 0.01,
          },
        ],
      },
      {
        id: "layer-alignment",
        label: "Layer, Align, Distribute",
        icon: Layers,
        features: [
          {
            id: "align-to-slide",
            label: "Align selected element to slide bounds",
            controlType: "action-group",
            target: "operation",
            options: ALIGN_TO_SLIDE_OPTIONS,
          },
          {
            id: "layer-order",
            label: "Layer order",
            controlType: "action-group",
            target: "operation",
            options: LAYER_ORDER_OPTIONS,
          },
          {
            id: "distribute",
            label: "Distribute selection",
            controlType: "action-group",
            target: "operation",
            options: DISTRIBUTE_OPTIONS,
          },
        ],
      },
      {
        id: "grouping",
        label: "Group",
        icon: Group,
        features: [
          {
            id: "group",
            label: "Group selection",
            controlType: "action-group",
            target: "operation",
            options: [{ value: "group", icon: Group, label: "Group" }],
          },
          {
            id: "ungroup",
            label: "Ungroup selected group",
            controlType: "action-group",
            target: "operation",
            options: [{ value: "ungroup", icon: Ungroup, label: "Ungroup" }],
          },
        ],
      },
    ],
  },
  {
    id: "misc",
    label: "Misc",
    icon: Lock,
    subgroups: [
      {
        id: "state",
        label: "State",
        icon: Lock,
        features: [
          {
            id: "locked",
            label: "Lock / unlock",
            controlType: "toggle",
            target: "attribute",
            attributeName: "data-editor-locked",
          },
        ],
      },
      {
        id: "link",
        label: "Link",
        icon: Link2,
        features: [
          {
            id: "link-url",
            label: "Link URL",
            controlType: "text",
            target: "attribute",
            attributeName: "data-link-url",
            placeholder: "https://",
          },
        ],
      },
    ],
  },
  {
    id: "others",
    label: "Others",
    icon: CaseSensitive,
    subgroups: [
      {
        id: "text-alternatives",
        label: "Text alternatives",
        icon: CaseSensitive,
        features: [
          {
            id: "alt-text",
            label: "Alt text",
            controlType: "text",
            target: "attribute",
            attributeName: "alt",
            placeholder: "Describe this element",
          },
        ],
      },
      {
        id: "labels",
        label: "Labels",
        icon: CaseSensitive,
        features: [
          {
            id: "aria-label",
            label: "ARIA label",
            controlType: "text",
            target: "attribute",
            attributeName: "aria-label",
            placeholder: "aria-label",
          },
        ],
      },
      {
        id: "css",
        label: "CSS",
        icon: Hash,
        features: [
          {
            id: "custom-css",
            label: "Custom CSS property",
            controlType: "custom-css",
            target: "style",
          },
        ],
      },
    ],
  },
];

export function getElementToolFeature(featureId: ElementToolFeatureId) {
  for (const group of ELEMENT_TOOL_GROUPS) {
    for (const subgroup of group.subgroups) {
      const feature = subgroup.features.find((candidate) => candidate.id === featureId);
      if (feature) {
        return feature;
      }
    }
  }

  return null;
}
