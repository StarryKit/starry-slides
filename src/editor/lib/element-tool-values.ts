import { parseTransformParts } from "../../core";
import type { CssPropertyRow } from "./collect-css-properties";
import type { ElementToolFeature, ElementToolOption } from "./element-tool-model";
import {
  getColorInputValue,
  isBoldFontWeight,
  isFontFamilySelected,
  parseTextDecorationLines,
} from "./style-controls";

interface ElementToolValueOptions {
  feature: ElementToolFeature;
  inspectedStyles: CssPropertyRow[];
  attributeValues: {
    locked: string;
    altText: string;
    ariaLabel: string;
    linkUrl: string;
  };
}

export function getElementToolValue({
  feature,
  inspectedStyles,
  attributeValues,
}: ElementToolValueOptions): string {
  if (feature.target === "attribute") {
    if (feature.attributeName === "data-editor-locked") {
      return attributeValues.locked;
    }
    if (feature.attributeName === "alt") {
      return attributeValues.altText;
    }
    if (feature.attributeName === "aria-label") {
      return attributeValues.ariaLabel;
    }
    if (feature.attributeName === "data-link-url") {
      return attributeValues.linkUrl;
    }
    return "";
  }

  if (!feature.propertyName) {
    return "";
  }

  const rawValue = getStyleValue(inspectedStyles, feature.propertyName);
  if (feature.id === "font-family") {
    return (
      feature.options?.find((option) => isFontFamilySelected(rawValue, option.value))?.value ??
      rawValue
    );
  }
  if (feature.id === "font-size" && rawValue.endsWith("px")) {
    return rawValue.slice(0, -2);
  }
  if (feature.id === "line-height" || feature.id === "opacity") {
    return rawValue || (feature.id === "opacity" ? "1" : "");
  }
  if (feature.id === "rotation") {
    return String(parseTransformParts(rawValue).rotate);
  }
  if (feature.controlType === "color") {
    return getColorInputValue(rawValue);
  }
  if (feature.id === "text-align" && rawValue === "start") {
    return "left";
  }

  return rawValue;
}

export function normalizeFeatureCommitValue(
  feature: ElementToolFeature,
  nextValue: string
): string {
  if (feature.id === "font-size" && nextValue.trim()) {
    return `${Math.min(200, Math.max(8, Number.parseFloat(nextValue) || 8))}px`;
  }

  if (feature.id === "font-bold") {
    return nextValue ? "700" : "400";
  }

  if (feature.id === "font-italic") {
    return nextValue ? "italic" : "normal";
  }

  if (feature.id === "font-underline") {
    return nextValue ? "underline" : "none";
  }

  if (feature.id === "font-strikethrough") {
    return nextValue ? "line-through" : "none";
  }

  if (feature.id === "locked") {
    return nextValue ? "true" : "";
  }

  return nextValue.trim();
}

export function getTextDecorationCommitValue(
  currentValue: string,
  line: "underline" | "line-through",
  active: boolean
): string {
  const nextLines = parseTextDecorationLines(currentValue);
  if (active) {
    nextLines.delete(line);
  } else {
    nextLines.add(line);
  }

  return nextLines.size ? Array.from(nextLines).join(" ") : "none";
}

export function isFeatureActive(feature: ElementToolFeature, currentValue: string): boolean {
  if (feature.id === "font-bold") {
    return isBoldFontWeight(currentValue);
  }
  if (feature.id === "font-italic") {
    return currentValue.trim().toLowerCase() === "italic";
  }
  if (feature.id === "font-underline") {
    return parseTextDecorationLines(currentValue).has("underline");
  }
  if (feature.id === "font-strikethrough") {
    return parseTextDecorationLines(currentValue).has("line-through");
  }
  if (feature.id === "locked") {
    return currentValue === "true";
  }

  return Boolean(currentValue);
}

export function getFeatureOptions(
  feature: ElementToolFeature,
  currentValue: string
): ElementToolOption[] {
  const options = feature.options ?? [{ label: "unset", value: "" }];
  if (!currentValue || options.some((option) => option.value === currentValue)) {
    return options;
  }

  return [{ label: currentValue, value: currentValue }, ...options];
}

function getStyleValue(styles: CssPropertyRow[], propertyName: string): string {
  return styles.find((property) => property.name === propertyName)?.value ?? "";
}
