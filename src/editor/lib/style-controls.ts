import type { CssPropertyRow } from "./collect-css-properties";

export type TextAlign = "left" | "center" | "right";

export interface FontFamilyOption {
  label: string;
  value: string;
}

export const FONT_FAMILY_OPTIONS: FontFamilyOption[] = [
  {
    label: "Inter",
    value: '"Inter", "IBM Plex Sans", "Segoe UI", sans-serif',
  },
  {
    label: "Aptos",
    value: '"Aptos", "Segoe UI", Arial, sans-serif',
  },
  {
    label: "Avenir Next",
    value: '"Avenir Next", "Montserrat", "Segoe UI", sans-serif',
  },
  {
    label: "Optima",
    value: '"Optima", "Candara", "Segoe UI", sans-serif',
  },
  {
    label: "Arial Narrow",
    value: '"Arial Narrow", "Roboto Condensed", "Helvetica Neue", sans-serif',
  },
  {
    label: "Georgia",
    value: 'Georgia, "Times New Roman", serif',
  },
  {
    label: "Times New Roman",
    value: '"Times New Roman", Times, serif',
  },
  {
    label: "Didot",
    value: '"Didot", "Bodoni 72", Georgia, serif',
  },
  {
    label: "SF Mono",
    value: '"SFMono-Regular", Menlo, Consolas, monospace',
  },
  {
    label: "IBM Plex Mono",
    value: '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace',
  },
  {
    label: "System UI",
    value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  {
    label: "Nunito",
    value: '"Nunito", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
  },
];

export const FONT_SIZE_OPTIONS = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64, 80];

export function getStyleValue(styles: CssPropertyRow[], propertyName: string): string {
  return styles.find((property) => property.name === propertyName)?.value ?? "";
}

export function parsePixelValue(value: string, fallback: number): number {
  const numericValue = Number.parseFloat(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function roundCssPixel(value: number): string {
  return `${Math.round(value * 100) / 100}px`;
}

export function getFontFamilyLabel(value: string): string {
  const matchedOption = getFontFamilyOption(value);
  if (matchedOption) {
    return matchedOption.label;
  }

  return getFirstFontFamily(value) || "Font";
}

export function isFontFamilySelected(currentValue: string, optionValue: string): boolean {
  const normalizedCurrent = normalizeFontFamily(currentValue);
  const normalizedOption = normalizeFontFamily(optionValue);

  if (!normalizedCurrent || !normalizedOption) {
    return false;
  }

  return (
    normalizedCurrent === normalizedOption ||
    normalizeFontName(getFirstFontFamily(currentValue)) ===
      normalizeFontName(getFirstFontFamily(optionValue))
  );
}

export function isBoldFontWeight(value: string): boolean {
  const normalizedValue = value.trim().toLowerCase();
  if (normalizedValue === "bold" || normalizedValue === "bolder") {
    return true;
  }

  const numericValue = Number.parseInt(normalizedValue, 10);
  return Number.isFinite(numericValue) && numericValue >= 600;
}

export function parseTextDecorationLines(value: string): Set<string> {
  const lines = new Set<string>();
  const normalizedValue = value.toLowerCase();

  if (!normalizedValue || normalizedValue === "none") {
    return lines;
  }

  for (const token of normalizedValue.split(/\s+/)) {
    if (token === "underline" || token === "line-through" || token === "overline") {
      lines.add(token);
    }
  }

  return lines;
}

export function getColorInputValue(value: string): string {
  if (isHexColor(value)) {
    return value.trim();
  }

  return rgbToHex(value) ?? "#000000";
}

export function isHexColor(value: string): boolean {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

function getFontFamilyOption(value: string): FontFamilyOption | undefined {
  return FONT_FAMILY_OPTIONS.find((option) => isFontFamilySelected(value, option.value));
}

function getFirstFontFamily(value: string): string {
  return (value.split(",")[0] ?? "").trim().replace(/^["']|["']$/g, "");
}

function normalizeFontFamily(value: string): string {
  return value.toLowerCase().replace(/["']/g, "").replace(/\s+/g, " ").trim();
}

function normalizeFontName(value: string): string {
  return value.toLowerCase().replace(/["']/g, "").trim();
}

function toHexChannel(value: string): string {
  const numericValue = Math.max(0, Math.min(255, Number.parseInt(value, 10) || 0));
  return numericValue.toString(16).padStart(2, "0");
}

function rgbToHex(value: string): string | null {
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
