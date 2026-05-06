export interface CssPropertyRow {
  name: string;
  value: string;
}

const CSS_PROPERTY_PREFIXES_TO_EXCLUDE = ["-webkit-", "-moz-", "-ms-"] as const;

const CSS_PROPERTIES_TO_EXCLUDE = new Set([
  "appearance",
  "caret-color",
  "color-interpolation",
  "color-rendering",
  "font-synthesis-small-caps",
  "font-synthesis-style",
  "font-synthesis-weight",
  "math-depth",
  "math-shift",
  "print-color-adjust",
  "ruby-align",
  "ruby-position",
  "speak",
  "text-size-adjust",
]);

function isRelevantCssProperty(name: string) {
  if (CSS_PROPERTY_PREFIXES_TO_EXCLUDE.some((prefix) => name.startsWith(prefix))) {
    return false;
  }

  return !CSS_PROPERTIES_TO_EXCLUDE.has(name);
}

export function collectCssProperties(element: HTMLElement): CssPropertyRow[] {
  const styles = window.getComputedStyle(element);
  const rows: CssPropertyRow[] = [];

  for (const name of Array.from(styles)) {
    if (!isRelevantCssProperty(name)) {
      continue;
    }

    const value =
      name === "transform" && element.style.transform
        ? element.style.transform.trim()
        : styles.getPropertyValue(name).trim();
    if (value.length === 0) {
      continue;
    }

    rows.push({ name, value });
  }

  return rows.sort((left, right) => left.name.localeCompare(right.name));
}
