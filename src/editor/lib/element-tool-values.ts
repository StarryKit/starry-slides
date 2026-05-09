import { DEFAULT_SLIDE_HEIGHT, DEFAULT_SLIDE_WIDTH, parseTransformParts } from "../../core";
import type { CssPropertyRow } from "./collect-css-properties";
import type { ElementToolFeature, ElementToolOption } from "./element-tool-model";
import {
  getColorInputValue,
  isBoldFontWeight,
  isFontFamilySelected,
  parsePixelValue,
  parseTextDecorationLines,
  roundCssPixel,
} from "./style-controls";

interface ElementToolValueOptions {
  feature: ElementToolFeature;
  inspectedStyles: CssPropertyRow[];
  attributeValues: {
    locked: string;
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
    if (feature.id === "other-link") {
      return attributeValues.linkUrl;
    }
    if (feature.id === "other-aria-label") {
      return attributeValues.ariaLabel;
    }
    if (feature.attributeName === "data-editor-locked") {
      return attributeValues.locked;
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
    const currentValue = Number.parseFloat(nextValue);
    const clampedValue = Math.min(
      200,
      Math.max(8, Number.isFinite(currentValue) ? currentValue : 8)
    );
    return `${clampedValue}px`;
  }

  if ((feature.id === "width" || feature.id === "height") && nextValue) {
    return normalizeSizePreset(feature.id, nextValue);
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

export function getSteppedFeatureValue({
  currentValue,
  feature,
  direction,
}: {
  currentValue: string;
  feature: ElementToolFeature;
  direction: "decrease" | "increase";
}): string {
  const sign = direction === "increase" ? 1 : -1;
  const step = feature.step ?? 1;

  if (feature.id === "font-size") {
    const currentSize = parsePixelValue(currentValue, 32);
    return String(clamp(currentSize + sign * step, feature.min ?? 8, feature.max ?? 200));
  }

  if (feature.id === "rotation") {
    const currentRotation = Number.parseFloat(currentValue) || 0;
    return String(clamp(currentRotation + sign * step, feature.min ?? -360, feature.max ?? 360));
  }

  return currentValue;
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
  if (feature.id === "font-size") {
    return feature.options ?? [];
  }

  const options = feature.options ?? [{ label: "unset", value: "" }];
  if (!currentValue || options.some((option) => option.value === currentValue)) {
    return options;
  }

  return [{ label: currentValue, value: currentValue }, ...options];
}

function getStyleValue(styles: CssPropertyRow[], propertyName: string): string {
  return styles.find((property) => property.name === propertyName)?.value ?? "";
}

function normalizeSizePreset(featureId: ElementToolFeature["id"], nextValue: string): string {
  if (nextValue === "auto") {
    return "";
  }

  const base = featureId === "width" ? DEFAULT_SLIDE_WIDTH : DEFAULT_SLIDE_HEIGHT;
  const ratio = getSizePresetRatio(nextValue);
  return roundCssPixel(base * ratio);
}

function getSizePresetRatio(value: string): number {
  if (value === "compact") {
    return 0.18;
  }
  if (value === "wide") {
    return 0.42;
  }
  if (value === "full") {
    return 0.82;
  }
  return 0.42;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
