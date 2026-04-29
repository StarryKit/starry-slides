export interface CssPropertyRow {
  name: string;
  value: string;
}

const INSPECTED_CSS_PROPERTIES = [
  "position",
  "display",
  "width",
  "height",
  "top",
  "right",
  "bottom",
  "left",
  "margin",
  "padding",
  "font-size",
  "font-weight",
  "line-height",
  "font-family",
  "letter-spacing",
  "text-transform",
  "color",
  "background",
  "background-color",
  "border",
  "border-radius",
  "box-shadow",
  "opacity",
  "transform",
  "text-align",
] as const;

export function collectCssProperties(element: HTMLElement): CssPropertyRow[] {
  const styles = window.getComputedStyle(element);

  return INSPECTED_CSS_PROPERTIES.map((name) => ({
    name,
    value: styles.getPropertyValue(name).trim(),
  })).filter((row) => row.value.length > 0);
}
