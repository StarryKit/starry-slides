import {
  DEFAULT_SLIDE_HEIGHT,
  DEFAULT_SLIDE_WIDTH,
  parseTransformParts,
} from "@starrykit/slides-core";
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

  const rawValue =
    feature.id === "background-color"
      ? getBackgroundColorToolValue(inspectedStyles)
      : getStyleValue(inspectedStyles, feature.propertyName);
  if (feature.id === "font-family") {
    return (
      feature.options?.find((option) => isFontFamilySelected(rawValue, option.value))?.value ??
      rawValue
    );
  }
  if (feature.id === "font-size" && rawValue.endsWith("px")) {
    return rawValue.slice(0, -2);
  }
  if (feature.id === "line-height") {
    return normalizeLineHeightValue(rawValue, inspectedStyles);
  }
  if (feature.id === "opacity") {
    return rawValue || "1";
  }
  if (feature.id === "rotation") {
    return String(parseTransformParts(rawValue).rotate);
  }
  if (feature.id === "background-color" && rawValue.trim().startsWith("linear-gradient")) {
    return rawValue;
  }
  if (feature.controlType === "color") {
    return getColorInputValue(
      getNormalizedBorderFeatureValue(feature.id, inspectedStyles) || rawValue
    );
  }
  const normalizedBorderValue = getNormalizedBorderFeatureValue(feature.id, inspectedStyles);
  if (normalizedBorderValue) {
    return normalizedBorderValue;
  }
  if (feature.id === "text-align" && rawValue === "start") {
    return "left";
  }

  return rawValue;
}

function getNormalizedBorderFeatureValue(
  featureId: ElementToolFeature["id"],
  inspectedStyles: CssPropertyRow[]
): string {
  if (featureId === "border") {
    return normalizeBorderStyleValue(
      getStyleValue(inspectedStyles, "border-style") ||
        getStyleValue(inspectedStyles, "border-top-style") ||
        parseBorderShorthand(inspectedStyles).style
    );
  }

  if (featureId === "border-width") {
    const borderParts = parseBorderShorthand(inspectedStyles);
    const borderStyle = normalizeBorderStyleValue(
      getStyleValue(inspectedStyles, "border-style") ||
        getStyleValue(inspectedStyles, "border-top-style") ||
        borderParts.style
    );
    const borderWidth = normalizeBorderWidthValue(
      getStyleValue(inspectedStyles, "border-width") ||
        getStyleValue(inspectedStyles, "border-top-width") ||
        borderParts.width
    );

    if (borderStyle === "none" && borderWidth === "0px") {
      return "3px";
    }

    return borderWidth;
  }

  if (featureId === "border-color") {
    return (
      getStyleValue(inspectedStyles, "border-color") ||
      getStyleValue(inspectedStyles, "border-top-color") ||
      parseBorderShorthand(inspectedStyles).color
    );
  }

  if (featureId === "border-radius") {
    return normalizeSingleCssValue(
      getStyleValue(inspectedStyles, "border-radius") ||
        getStyleValue(inspectedStyles, "border-top-left-radius")
    );
  }

  if (featureId === "box-shadow") {
    return getStyleValue(inspectedStyles, "box-shadow") || "none";
  }

  return "";
}

function parseBorderShorthand(inspectedStyles: CssPropertyRow[]) {
  const borderValue = getStyleValue(inspectedStyles, "border");
  return {
    color: parseBorderColor(borderValue),
    style: parseBorderStyle(borderValue),
    width: parseBorderWidth(borderValue),
  };
}

function normalizeBorderStyleValue(value: string): string {
  const normalizedValue = value.trim().toLowerCase();
  if (normalizedValue.includes("dashed")) {
    return "dashed";
  }
  if (normalizedValue.includes("dotted")) {
    return "dotted";
  }
  if (normalizedValue.includes("solid")) {
    return "solid";
  }
  if (normalizedValue.includes("none") || !normalizedValue) {
    return "none";
  }

  return normalizedValue.split(/\s+/)[0] ?? "none";
}

function normalizeBorderWidthValue(value: string): string {
  return normalizeSingleCssValue(value) || "3px";
}

function normalizeSingleCssValue(value: string): string {
  const firstValue = value.trim().split(/\s+/)[0] ?? "";
  return firstValue;
}

function parseBorderStyle(value: string): string {
  return (
    value
      .trim()
      .split(/\s+/)
      .find((token) =>
        [
          "none",
          "hidden",
          "dotted",
          "dashed",
          "solid",
          "double",
          "groove",
          "ridge",
          "inset",
          "outset",
        ].includes(token.toLowerCase())
      ) ?? ""
  );
}

function parseBorderWidth(value: string): string {
  return (
    value
      .trim()
      .split(/\s+/)
      .find((token) => /^(?:\d+(?:\.\d+)?px|thin|medium|thick)$/i.test(token)) ?? ""
  );
}

function parseBorderColor(value: string): string {
  return (
    value.trim().match(/(?:rgba?\([^)]+\)|hsla?\([^)]+\)|#[0-9a-f]{3,8}\b|(?:[a-z]+))/i)?.[0] ?? ""
  );
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

  if (feature.id === "border-width" && nextValue.trim()) {
    const currentValue = Number.parseFloat(nextValue);
    const clampedValue = Math.min(
      24,
      Math.max(0, Number.isFinite(currentValue) ? currentValue : 0)
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

function normalizeLineHeightValue(rawValue: string, inspectedStyles: CssPropertyRow[]): string {
  if (!rawValue) {
    return "";
  }

  if (!rawValue.endsWith("px")) {
    return rawValue;
  }

  const lineHeight = Number.parseFloat(rawValue);
  const fontSize = Number.parseFloat(getStyleValue(inspectedStyles, "font-size"));
  if (!Number.isFinite(lineHeight) || !Number.isFinite(fontSize) || fontSize <= 0) {
    return rawValue;
  }

  return String(Math.round((lineHeight / fontSize) * 100) / 100);
}

function getBackgroundColorToolValue(styles: CssPropertyRow[]): string {
  const backgroundImage = getStyleValue(styles, "background-image");
  if (backgroundImage.trim().toLowerCase().startsWith("linear-gradient")) {
    return backgroundImage;
  }

  return getStyleValue(styles, "background-color");
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
