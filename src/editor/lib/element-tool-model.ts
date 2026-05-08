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
  Italic,
  Layers,
  Link2,
  Lock,
  Minus,
  Palette,
  Pilcrow,
  Plus,
  RotateCw,
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

export const FONT_SIZE_TOOL_OPTIONS: ElementToolOption[] = [
  { value: "decrease", icon: Minus, label: "Decrease font size" },
  { value: "increase", icon: Plus, label: "Increase font size" },
];

export const LINE_HEIGHT_OPTIONS: ElementToolOption[] = [
  { value: "1", label: "Tight", description: "Compact text blocks" },
  { value: "1.2", label: "Normal", description: "Balanced paragraph spacing" },
  { value: "1.45", label: "Relaxed", description: "Readable body copy" },
  { value: "1.7", label: "Airy", description: "Open editorial spacing" },
];

export const SIZE_PRESET_OPTIONS: ElementToolOption[] = [
  { value: "compact", label: "Compact", description: "Small supporting element" },
  { value: "wide", label: "Wide", description: "Primary text or media area" },
  { value: "full", label: "Full width", description: "Span most of the slide" },
  { value: "auto", label: "Auto fit", description: "Let content define the size" },
];

export const OPACITY_OPTIONS: ElementToolOption[] = [
  { value: "1", label: "100%" },
  { value: "0.75", label: "75%" },
  { value: "0.5", label: "50%" },
  { value: "0.25", label: "25%" },
];

export const ROTATION_OPTIONS: ElementToolOption[] = [
  { value: "-15", label: "-15" },
  { value: "0", label: "0" },
  { value: "15", label: "15" },
  { value: "45", label: "45" },
];

export const BORDER_STYLE_OPTIONS: ElementToolOption[] = [
  { value: "none", label: "None" },
  { value: "1px solid rgba(15, 23, 42, 0.16)", label: "Hairline" },
  { value: "2px solid rgba(15, 23, 42, 0.22)", label: "Strong" },
  { value: "1px dashed rgba(15, 23, 42, 0.3)", label: "Dashed" },
];

export const BORDER_RADIUS_OPTIONS: ElementToolOption[] = [
  { value: "0px", label: "Sharp" },
  { value: "8px", label: "Soft" },
  { value: "18px", label: "Round" },
  { value: "999px", label: "Pill" },
];

export const SHADOW_OPTIONS: ElementToolOption[] = [
  { value: "none", label: "None" },
  { value: "0 8px 22px rgba(15, 23, 42, 0.12)", label: "Soft" },
  { value: "0 18px 42px rgba(15, 23, 42, 0.18)", label: "Lifted" },
  { value: "0 28px 70px rgba(15, 23, 42, 0.24)", label: "Dramatic" },
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
            controlType: "action-group",
            target: "style",
            propertyName: "font-size",
            options: FONT_SIZE_TOOL_OPTIONS,
            min: 8,
            max: 200,
            step: 2,
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
            controlType: "action-group",
            target: "style",
            propertyName: "line-height",
            options: LINE_HEIGHT_OPTIONS,
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
            controlType: "action-group",
            target: "style",
            propertyName: "border",
            options: BORDER_STYLE_OPTIONS,
          },
          {
            id: "border-radius",
            label: "Border radius",
            controlType: "action-group",
            target: "style",
            propertyName: "border-radius",
            options: BORDER_RADIUS_OPTIONS,
          },
          {
            id: "box-shadow",
            label: "Shadow",
            controlType: "action-group",
            target: "style",
            propertyName: "box-shadow",
            options: SHADOW_OPTIONS,
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
            controlType: "action-group",
            target: "style",
            propertyName: "width",
            options: SIZE_PRESET_OPTIONS,
          },
          {
            id: "height",
            label: "Height",
            controlType: "action-group",
            target: "style",
            propertyName: "height",
            options: SIZE_PRESET_OPTIONS,
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
            controlType: "action-group",
            target: "style",
            propertyName: "opacity",
            options: OPACITY_OPTIONS,
          },
        ],
      },
      {
        id: "rotation",
        label: "Rotation",
        icon: RotateCw,
        features: [
          {
            id: "rotation",
            label: "Rotation",
            controlType: "action-group",
            target: "style",
            propertyName: "transform",
            options: ROTATION_OPTIONS,
            min: -360,
            max: 360,
            step: 15,
            unit: "deg",
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
