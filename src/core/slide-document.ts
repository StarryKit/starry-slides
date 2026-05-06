import {
  DEFAULT_SLIDE_HEIGHT,
  DEFAULT_SLIDE_WIDTH,
  type EditableElement,
  type EditableType,
  type GroupElement,
  SELECTOR_ATTR,
  SLIDE_ROOT_ATTR,
  type SlideModel,
  createElementId,
  getSlideElementSelector,
  normalizeSlideId,
  parseDimension,
} from "./slide-contract";

function parseHtmlDocument(html: string): Document | null {
  if (typeof DOMParser === "undefined") {
    return null;
  }

  const parser = new DOMParser();
  return parser.parseFromString(html, "text/html");
}

function ensureSlideRoot(doc: Document): HTMLElement | null {
  const existingRoot = doc.querySelector<HTMLElement>(`[${SLIDE_ROOT_ATTR}]`);
  if (existingRoot) {
    if (!existingRoot.getAttribute("data-slide-width")) {
      existingRoot.setAttribute("data-slide-width", String(DEFAULT_SLIDE_WIDTH));
    }
    if (!existingRoot.getAttribute("data-slide-height")) {
      existingRoot.setAttribute("data-slide-height", String(DEFAULT_SLIDE_HEIGHT));
    }
    return existingRoot;
  }

  const container = doc.querySelector<HTMLElement>(".slide-container");
  if (container) {
    container.setAttribute(SLIDE_ROOT_ATTR, "true");
    if (!container.getAttribute("data-slide-width")) {
      container.setAttribute("data-slide-width", String(DEFAULT_SLIDE_WIDTH));
    }
    if (!container.getAttribute("data-slide-height")) {
      container.setAttribute("data-slide-height", String(DEFAULT_SLIDE_HEIGHT));
    }
    return container;
  }

  return null;
}

function serializeHtmlDocument(doc: Document): string {
  return `<!DOCTYPE html>
${doc.documentElement.outerHTML}`;
}

export function ensureEditableSelectors(html: string): string {
  const doc = parseHtmlDocument(html);
  if (!doc) {
    return html;
  }

  const root = ensureSlideRoot(doc);
  const editableNodes = Array.from(doc.querySelectorAll<HTMLElement>("[data-editable]"));

  if (root && !root.getAttribute(SELECTOR_ATTR)) {
    root.setAttribute(SELECTOR_ATTR, "slide-root");
  }

  editableNodes.forEach((node, index) => {
    if (!node.getAttribute(SELECTOR_ATTR)) {
      const type = (node.getAttribute("data-editable") || "block") as EditableType;
      node.setAttribute(SELECTOR_ATTR, createElementId(index, type));
    }
  });

  return serializeHtmlDocument(doc);
}

export function parseSlide(html: string, slideId = "slide-1"): SlideModel {
  const doc = parseHtmlDocument(html);
  if (!doc) {
    return {
      id: slideId,
      title: "Untitled Slide",
      htmlSource: html,
      rootSelector: `[${SLIDE_ROOT_ATTR}]`,
      width: DEFAULT_SLIDE_WIDTH,
      height: DEFAULT_SLIDE_HEIGHT,
      elements: [],
    };
  }

  const normalizedHtml = ensureEditableSelectors(html);
  const normalizedDoc = parseHtmlDocument(normalizedHtml);
  if (!normalizedDoc) {
    return {
      id: slideId,
      title: "Untitled Slide",
      htmlSource: normalizedHtml,
      rootSelector: `[${SLIDE_ROOT_ATTR}]`,
      width: DEFAULT_SLIDE_WIDTH,
      height: DEFAULT_SLIDE_HEIGHT,
      elements: [],
    };
  }

  const root = ensureSlideRoot(normalizedDoc);
  const editableNodes = Array.from(normalizedDoc.querySelectorAll<HTMLElement>("[data-editable]"));
  const rootSelector = root?.getAttribute(SELECTOR_ATTR)
    ? `[${SELECTOR_ATTR}="${root.getAttribute(SELECTOR_ATTR)}"]`
    : `[${SLIDE_ROOT_ATTR}]`;
  const width = parseDimension(root?.getAttribute("data-slide-width") ?? null, DEFAULT_SLIDE_WIDTH);
  const height = parseDimension(
    root?.getAttribute("data-slide-height") ?? null,
    DEFAULT_SLIDE_HEIGHT
  );

  let elements = editableNodes.map<EditableElement>((node, index) => {
    const type = (node.getAttribute("data-editable") || "block") as EditableType;
    const selectorValue = node.getAttribute(SELECTOR_ATTR) || createElementId(index, type);

    return {
      id: selectorValue,
      selector: getSlideElementSelector(selectorValue),
      type,
      content: node instanceof HTMLImageElement ? node.src : node.textContent || "",
      tagName: node.tagName.toLowerCase(),
    };
  });

  // Restructure flat elements list into tree: nest children under group parents.
  const childOfGroup = new Set<string>();
  const groupMap = new Map<string, GroupElement>();

  for (const element of elements) {
    const node = querySlideElement<HTMLElement>(normalizedDoc, element.id);
    const parent = node?.parentElement;
    if (parent?.getAttribute("data-group") === "true") {
      const groupId = parent.getAttribute(SELECTOR_ATTR);
      if (groupId) {
        childOfGroup.add(element.id);
        if (!groupMap.has(groupId)) {
          const groupElement = elements.find((e) => e.id === groupId);
          if (groupElement) {
            groupMap.set(groupId, {
              ...groupElement,
              type: "group" as const,
              children: [],
            });
          }
        }
        groupMap.get(groupId)?.children.push(element);
      }
    }
  }

  elements = elements.reduce<EditableElement[]>((acc, element) => {
    if (groupMap.has(element.id)) {
      acc.push(groupMap.get(element.id)!);
    } else if (!childOfGroup.has(element.id)) {
      acc.push(element);
    }
    return acc;
  }, []);

  const firstHeading = normalizedDoc.querySelector("h1, h2, title");
  const title = firstHeading?.textContent?.trim() || `Slide ${slideId}`;

  return {
    id: normalizeSlideId(slideId),
    title,
    htmlSource: normalizedHtml,
    rootSelector,
    width,
    height,
    elements,
  };
}

export function querySlideElement<T extends Element = HTMLElement>(
  doc: ParentNode,
  elementId: string
): T | null {
  return doc.querySelector<T>(getSlideElementSelector(elementId));
}

export function getSlideInlineStyleValue(
  slide: SlideModel,
  elementId: string,
  propertyName: string
): string {
  const doc = parseHtmlDocument(slide.htmlSource);
  if (!doc) {
    return "";
  }

  const node = querySlideElement<HTMLElement>(doc, elementId);
  return node?.style.getPropertyValue(propertyName).trim() || "";
}
