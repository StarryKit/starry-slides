import type { LucideIcon } from "lucide-react";
import { FONT_FAMILY_OPTIONS } from "./style-controls";

export type ElementToolFeatureId =
  | "font-family"
  | "font-size"
  | "font-bold"
  | "font-italic"
  | "font-underline"
  | "font-strikethrough"
  | "line-height"
  | "text-align"
  | "text-color"
  | "background-color"
  | "border"
  | "border-radius"
  | "box-shadow"
  | "width"
  | "height"
  | "opacity"
  | "rotation"
  | "align-to-slide"
  | "distribute"
  | "layer-order"
  | "group"
  | "ungroup"
  | "locked"
  | "link-url"
  | "alt-text"
  | "aria-label"
  | "custom-css";

export type ElementToolControlType =
  | "select"
  | "number"
  | "toggle"
  | "color"
  | "text"
  | "slider"
  | "action-group"
  | "custom-css";

export interface ElementToolOption {
  label: string;
  value: string;
  icon?: LucideIcon;
}

export interface ElementToolFeature {
  id: ElementToolFeatureId;
  label: string;
  controlType: ElementToolControlType;
  target: "style" | "attribute" | "operation";
  propertyName?: string;
  attributeName?: string;
  options?: ElementToolOption[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  placeholder?: string;
}

export interface ElementToolSubgroup {
  id: string;
  label: string;
  icon: LucideIcon;
  features: ElementToolFeature[];
}

export interface ElementToolGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  subgroups: ElementToolSubgroup[];
}
